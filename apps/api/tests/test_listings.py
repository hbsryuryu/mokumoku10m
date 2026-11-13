"""Feature LST-004: 出品 API のテスト（仕様: docs/api/listings.md）。"""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import Settings
from app.db import utcnow
from app.main import create_app
from app.models import Auction, Category, Listing, User


@pytest.fixture
def make_client():
    """別の会員としてログインしたクライアントを作る（Cookie はクライアントごと）。"""
    settings = Settings(app_env="local", dev_login_enabled=True)

    def _make(name: str | None = None) -> TestClient:
        client = TestClient(create_app(settings))
        if name:
            assert client.post("/api/v1/dev/login", json={"displayName": name}).status_code == 200
        return client

    return _make


@pytest.fixture
def seller(make_client):
    return make_client("seller1")


@pytest.fixture
def category_id(db):
    return db.scalar(select(Category.id).where(Category.name == "インテリア"))


def draft_body(category_id: int, **overrides) -> dict:
    body = {
        "title": "木の持ち手の小さなかご",
        "description": "数回使用しました。目立った傷はありません。",
        "categoryId": category_id,
        "condition": "like_new",
        "shippingPayer": "seller",
        "shippingMethod": "ゆうパケット",
        "startPriceYen": 1000,
        "durationHours": 72,
    }
    body.update(overrides)
    return body


def create_draft(client, category_id, **overrides) -> dict:
    response = client.post("/api/v1/listings", json=draft_body(category_id, **overrides))
    assert response.status_code == 201, response.json()
    return response.json()


def publish(client, listing: dict) -> dict:
    response = client.post(
        f"/api/v1/listings/{listing['id']}/publish", json={"expectedVersion": listing["version"]}
    )
    assert response.status_code == 200, response.json()
    return response.json()


# --- カテゴリ -----------------------------------------------------------------


def test_categories_are_listed_without_login(make_client):
    response = make_client().get("/api/v1/categories")
    assert response.status_code == 200
    assert [c["name"] for c in response.json()] == ["ファッション", "インテリア", "本・ホビー", "家電", "その他"]


# --- 下書きの作成 -------------------------------------------------------------


def test_create_draft(seller, category_id):
    listing = create_draft(seller, category_id, buyoutPriceYen=5000)

    assert listing["status"] == "draft"
    assert listing["version"] == 1
    assert listing["conditionLabel"] == "目立った傷や汚れなし"
    assert listing["startPriceYen"] == 1000
    assert listing["buyoutPriceYen"] == 5000
    assert listing["autoExtension"] is True  # ADR-0007: 既定値「あり」
    assert listing["seller"]["displayName"] == "seller1"
    assert listing["auction"] is None


def test_create_requires_login(make_client, category_id):
    response = make_client().post("/api/v1/listings", json=draft_body(category_id))
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_create_requires_nickname(seller, category_id, db):
    db.execute(User.__table__.update().values(display_name=None))
    db.commit()
    response = seller.post("/api/v1/listings", json=draft_body(category_id))
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "NICKNAME_REQUIRED"


def test_title_is_trimmed(seller, category_id):
    assert create_draft(seller, category_id, title="  かご  ")["title"] == "かご"


@pytest.mark.parametrize(
    "overrides, field",
    [
        ({"title": "   "}, "title"),
        ({"title": "あ" * 61}, "title"),
        ({"description": "あ" * 501}, "description"),
        ({"condition": "broken"}, "condition"),
        ({"shippingPayer": "nobody"}, "shippingPayer"),
        ({"shippingMethod": ""}, "shippingMethod"),
        ({"startPriceYen": 0}, "startPriceYen"),
        ({"startPriceYen": 10_000_001}, "startPriceYen"),
        ({"durationHours": 12}, "durationHours"),
        ({"durationHours": 7 * 24 + 12}, "durationHours"),
    ],
)
def test_create_validation(seller, category_id, overrides, field):
    response = seller.post("/api/v1/listings", json=draft_body(category_id, **overrides))
    assert response.status_code == 422
    body = response.json()["error"]
    assert body["code"] == "VALIDATION_ERROR"
    assert field in [f["field"] for f in body["details"]["fields"]]


def test_buyout_must_be_higher_than_start(seller, category_id):
    response = seller.post("/api/v1/listings", json=draft_body(category_id, buyoutPriceYen=1000))
    assert response.status_code == 422


def test_unknown_category_is_rejected(seller):
    response = seller.post("/api/v1/listings", json=draft_body(999_999))
    assert response.status_code == 422
    assert response.json()["error"]["details"]["fields"][0]["field"] == "categoryId"


# --- 見え方（IDOR 対策） -----------------------------------------------------


def test_draft_is_visible_only_to_owner(seller, make_client, category_id):
    listing = create_draft(seller, category_id)

    assert seller.get(f"/api/v1/listings/{listing['id']}").status_code == 200
    assert make_client("buyer1").get(f"/api/v1/listings/{listing['id']}").status_code == 404
    assert make_client().get(f"/api/v1/listings/{listing['id']}").status_code == 404


def test_published_listing_is_visible_to_guest(seller, make_client, category_id):
    listing = publish(seller, create_draft(seller, category_id))
    response = make_client().get(f"/api/v1/listings/{listing['id']}")
    assert response.status_code == 200
    assert response.json()["status"] == "published"


# --- 編集（楽観ロック） ------------------------------------------------------


def test_update_draft_increments_version(seller, category_id):
    listing = create_draft(seller, category_id)
    response = seller.patch(
        f"/api/v1/listings/{listing['id']}", json={"expectedVersion": 1, "title": "大きなかご"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "大きなかご"
    assert response.json()["version"] == 2


def test_update_with_stale_version_is_rejected(seller, category_id):
    """別タブで先に保存された内容を、古い画面からの保存で上書きしない。"""
    listing = create_draft(seller, category_id)
    url = f"/api/v1/listings/{listing['id']}"
    assert seller.patch(url, json={"expectedVersion": 1, "title": "タブA"}).status_code == 200

    response = seller.patch(url, json={"expectedVersion": 1, "title": "タブB"})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "VERSION_CONFLICT"
    assert response.json()["error"]["details"]["currentVersion"] == 2
    assert seller.get(url).json()["title"] == "タブA"


def test_update_requires_expected_version(seller, category_id):
    listing = create_draft(seller, category_id)
    response = seller.patch(f"/api/v1/listings/{listing['id']}", json={"title": "x"})
    assert response.status_code == 422


def test_update_can_remove_buyout_price(seller, category_id):
    listing = create_draft(seller, category_id, buyoutPriceYen=5000)
    response = seller.patch(
        f"/api/v1/listings/{listing['id']}", json={"expectedVersion": 1, "buyoutPriceYen": None}
    )
    assert response.json()["buyoutPriceYen"] is None


def test_update_checks_buyout_against_existing_start_price(seller, category_id):
    listing = create_draft(seller, category_id, startPriceYen=3000)
    response = seller.patch(
        f"/api/v1/listings/{listing['id']}", json={"expectedVersion": 1, "buyoutPriceYen": 2000}
    )
    assert response.status_code == 422


def test_other_user_cannot_update(seller, make_client, category_id):
    listing = create_draft(seller, category_id)
    response = make_client("buyer1").patch(
        f"/api/v1/listings/{listing['id']}", json={"expectedVersion": 1, "title": "乗っ取り"}
    )
    assert response.status_code == 404


def test_published_listing_cannot_be_edited_yet(seller, category_id):
    listing = publish(seller, create_draft(seller, category_id))
    response = seller.patch(
        f"/api/v1/listings/{listing['id']}", json={"expectedVersion": listing["version"], "title": "x"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LISTING_NOT_EDITABLE"


# --- 公開 ---------------------------------------------------------------------


def test_publish_starts_auction(seller, category_id):
    draft = create_draft(seller, category_id, durationHours=13, buyoutPriceYen=8000, autoExtension=False)
    before = utcnow()

    listing = publish(seller, draft)

    assert listing["status"] == "published"
    assert listing["version"] == 2
    auction = listing["auction"]
    assert auction["status"] == "active"
    assert auction["startPriceYen"] == 1000
    assert auction["buyoutPriceYen"] == 8000
    assert auction["autoExtension"] is False
    assert auction["currentPriceYen"] == 1000
    assert auction["minimumBidYen"] == 1000  # 入札がないので開始価格
    assert auction["bidCount"] == 0
    assert auction["endsAt"].endswith("Z")  # UTC
    starts = datetime.fromisoformat(auction["startsAt"].replace("Z", "+00:00"))
    ends = datetime.fromisoformat(auction["endsAt"].replace("Z", "+00:00"))
    assert ends - starts == timedelta(hours=13)
    assert starts >= before - timedelta(seconds=1)


def test_publish_twice_is_rejected(seller, category_id):
    draft = create_draft(seller, category_id)
    publish(seller, draft)
    response = seller.post(f"/api/v1/listings/{draft['id']}/publish", json={"expectedVersion": 2})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LISTING_NOT_EDITABLE"


def test_publish_with_stale_version_is_rejected(seller, category_id, db):
    draft = create_draft(seller, category_id)
    seller.patch(f"/api/v1/listings/{draft['id']}", json={"expectedVersion": 1, "title": "変更"})

    response = seller.post(f"/api/v1/listings/{draft['id']}/publish", json={"expectedVersion": 1})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "VERSION_CONFLICT"
    assert db.scalar(select(Auction)) is None


def test_other_user_cannot_publish(seller, make_client, category_id):
    draft = create_draft(seller, category_id)
    response = make_client("buyer1").post(
        f"/api/v1/listings/{draft['id']}/publish", json={"expectedVersion": 1}
    )
    assert response.status_code == 404


# --- 取り下げ・破棄 -----------------------------------------------------------


def test_withdraw_published_listing(seller, make_client, category_id):
    listing = publish(seller, create_draft(seller, category_id))

    response = seller.post(
        f"/api/v1/listings/{listing['id']}/withdraw", json={"expectedVersion": listing["version"]}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "cancelled"
    assert body["auction"]["status"] == "cancelled"
    assert body["auction"]["endReason"] == "cancelled"
    # 取り下げた出品は、ほかの人からは見えない
    assert make_client().get(f"/api/v1/listings/{listing['id']}").status_code == 404


def test_withdraw_with_stale_version_is_rejected(seller, category_id):
    listing = publish(seller, create_draft(seller, category_id))
    response = seller.post(f"/api/v1/listings/{listing['id']}/withdraw", json={"expectedVersion": 1})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "VERSION_CONFLICT"


def test_draft_cannot_be_withdrawn(seller, category_id):
    draft = create_draft(seller, category_id)
    response = seller.post(f"/api/v1/listings/{draft['id']}/withdraw", json={"expectedVersion": 1})
    assert response.status_code == 409


def test_delete_draft(seller, category_id):
    draft = create_draft(seller, category_id)
    assert seller.delete(f"/api/v1/listings/{draft['id']}").status_code == 204
    assert seller.get(f"/api/v1/listings/{draft['id']}").status_code == 404


def test_published_listing_cannot_be_deleted(seller, category_id):
    listing = publish(seller, create_draft(seller, category_id))
    assert seller.delete(f"/api/v1/listings/{listing['id']}").status_code == 409


# --- 一覧・検索 ---------------------------------------------------------------


def test_search_shows_only_active_published(seller, make_client, category_id, db):
    create_draft(seller, category_id, title="下書きのかご")
    shown = publish(seller, create_draft(seller, category_id, title="公開中のかご"))
    withdrawn = publish(seller, create_draft(seller, category_id, title="取り下げたかご"))
    seller.post(f"/api/v1/listings/{withdrawn['id']}/withdraw", json={"expectedVersion": withdrawn["version"]})
    expired = publish(seller, create_draft(seller, category_id, title="期限切れのかご"))
    # 時刻は1回だけ取る（utcnow() を何度も呼ぶと値がずれて、ends_at < original_ends_at になりうる）
    now = utcnow()
    db.execute(
        Auction.__table__.update()
        .where(Auction.listing_id == expired["id"])
        .values(
            starts_at=now - timedelta(days=2),
            ends_at=now - timedelta(minutes=1),
            original_ends_at=now - timedelta(minutes=1),
        )
    )
    db.commit()

    body = make_client().get("/api/v1/listings").json()

    assert [item["id"] for item in body["items"]] == [shown["id"]]
    assert body["items"][0]["currentPriceYen"] == 1000
    assert body["hasMore"] is False


def test_search_by_keyword_and_category(seller, make_client, category_id, db):
    other_category = db.scalar(select(Category.id).where(Category.name == "家電"))
    a = publish(seller, create_draft(seller, category_id, title="白い花器"))
    publish(seller, create_draft(seller, category_id, title="木の椅子"))
    publish(seller, create_draft(seller, other_category, title="白いラジオ"))
    guest = make_client()

    assert [i["id"] for i in guest.get("/api/v1/listings", params={"q": "花器"}).json()["items"]] == [a["id"]]
    found = guest.get("/api/v1/listings", params={"q": "白い", "categoryId": category_id}).json()["items"]
    assert [i["id"] for i in found] == [a["id"]]


def test_search_keyword_wildcards_are_literal(seller, make_client, category_id):
    publish(seller, create_draft(seller, category_id, title="100%綿のシャツ"))
    publish(seller, create_draft(seller, category_id, title="綿のシャツ"))
    guest = make_client()

    assert len(guest.get("/api/v1/listings", params={"q": "%"}).json()["items"]) == 1
    assert len(guest.get("/api/v1/listings", params={"q": "_"}).json()["items"]) == 0


def test_search_sort_and_paging(seller, make_client, category_id):
    late = publish(seller, create_draft(seller, category_id, title="長い", durationHours=100))
    soon = publish(seller, create_draft(seller, category_id, title="短い", durationHours=13))
    guest = make_client()

    ending = guest.get("/api/v1/listings", params={"sort": "ending"}).json()["items"]
    assert [i["id"] for i in ending] == [soon["id"], late["id"]]
    newest = guest.get("/api/v1/listings", params={"sort": "newest"}).json()["items"]
    assert newest[0]["id"] == soon["id"]

    page1 = guest.get("/api/v1/listings", params={"limit": 1}).json()
    page2 = guest.get("/api/v1/listings", params={"limit": 1, "offset": 1}).json()
    assert page1["hasMore"] is True and page2["hasMore"] is False
    assert page1["items"][0]["id"] != page2["items"][0]["id"]


def test_my_listings_include_drafts_and_require_login(seller, make_client, category_id):
    draft = create_draft(seller, category_id)
    published = publish(seller, create_draft(seller, category_id))
    create_draft(make_client("other"), category_id)

    ids = {i["id"] for i in seller.get("/api/v1/me/listings").json()["items"]}
    assert ids == {draft["id"], published["id"]}
    drafts = seller.get("/api/v1/me/listings", params={"status": "draft"}).json()["items"]
    assert [i["id"] for i in drafts] == [draft["id"]]
    assert make_client().get("/api/v1/me/listings").status_code == 401


def test_listing_rows_match_api(seller, category_id, db):
    """API の値が DB に正しく保存されていること（列名の対応の確認）。"""
    listing = create_draft(seller, category_id, startPriceYen=1234, buyoutPriceYen=5678, durationHours=24)
    row = db.get(Listing, listing["id"])
    assert (row.start_price, row.buyout_price, row.duration_hours) == (1234, 5678, 24)
