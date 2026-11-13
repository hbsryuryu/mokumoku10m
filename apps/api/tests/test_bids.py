"""Feature BID-001: 入札 API のテスト。

ケース ID は docs/testing/auction-test-cases.md、受け入れ条件は docs/api/openapi.md「入札成功レスポンス」。
"""

import threading
import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

import app.bids.service as bid_service
from app.bids.pricing import AcceptedBid, compute_price
from app.config import Settings
from app.db import SessionLocal, utcnow
from app.main import create_app
from app.models import Auction, Bid, BidRequest, Category, Listing, Order, User


@pytest.fixture
def make_client():
    settings = Settings(app_env="local", dev_login_enabled=True)

    def _make(name: str | None = None) -> TestClient:
        client = TestClient(create_app(settings))
        if name:
            assert client.post("/api/v1/dev/login", json={"displayName": name}).status_code == 200
        return client

    return _make


@pytest.fixture
def seller(make_client):
    return make_client("seller")


@pytest.fixture
def a(make_client):
    return make_client("A")


@pytest.fixture
def b(make_client):
    return make_client("B")


@pytest.fixture
def listing_factory(seller, db):
    category_id = db.scalar(select(Category.id))

    def _make(start=100, buyout=None, auto_extension=True, duration=72) -> int:
        body = {
            "title": "かご",
            "description": "説明",
            "categoryId": category_id,
            "condition": "new",
            "shippingPayer": "seller",
            "shippingMethod": "ゆうパケット",
            "startPriceYen": start,
            "buyoutPriceYen": buyout,
            "autoExtension": auto_extension,
            "durationHours": duration,
        }
        created = seller.post("/api/v1/listings", json=body).json()
        published = seller.post(f"/api/v1/listings/{created['id']}/publish", json={"expectedVersion": 1})
        assert published.status_code == 200, published.json()
        return created["id"]

    return _make


def bid(client: TestClient, listing_id: int, amount, key: str | None = None):
    headers = {"Idempotency-Key": key or uuid.uuid4().hex}
    return client.post(f"/api/v1/listings/{listing_id}/bids", json={"amountYen": amount}, headers=headers)


def auction_of(listing_id: int) -> Auction:
    with SessionLocal() as db:
        return db.scalar(select(Auction).where(Auction.listing_id == listing_id))


def set_ends_at(listing_id: int, ends_at):
    with SessionLocal() as db:
        auction = db.scalar(select(Auction).where(Auction.listing_id == listing_id))
        auction.starts_at = ends_at - timedelta(days=1)
        auction.ends_at = ends_at
        auction.original_ends_at = ends_at
        db.commit()


def count(model) -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(model))


# --- 成功レスポンスの形 -------------------------------------------------------


def test_first_bid_leads_at_start_price(a, listing_factory):
    listing_id = listing_factory(start=1000)

    response = bid(a, listing_id, 2500)

    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["result"] == "leading"
    assert body["bid"]["amountYen"] == 2500
    assert isinstance(body["bid"]["id"], str)
    assert body["bid"]["acceptedAt"].endswith("Z")
    assert body["auction"]["status"] == "active"
    assert body["auction"]["currentPriceYen"] == 1000
    assert body["order"] is None


# --- 入札額（BID-01〜06） -----------------------------------------------------


def test_bid_01_minimum_is_start_price_without_bids(a, b, listing_factory):
    listing_id = listing_factory(start=100)
    rejected = bid(a, listing_id, 99)
    assert rejected.status_code == 409
    assert rejected.json()["error"]["code"] == "BID_TOO_LOW"
    assert rejected.json()["error"]["details"]["minimumBidYen"] == 100
    assert bid(b, listing_id, 100).status_code == 201


def test_bid_02_seller_cannot_bid(seller, listing_factory):
    response = bid(seller, listing_factory(), 500)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "SELLER_CANNOT_BID"
    assert count(Bid) == 0


def test_bid_03_draft_is_not_found(seller, a, db):
    category_id = db.scalar(select(Category.id))
    draft = seller.post(
        "/api/v1/listings",
        json={
            "title": "x", "description": "x", "categoryId": category_id, "condition": "new",
            "shippingPayer": "seller", "shippingMethod": "x", "startPriceYen": 100, "durationHours": 24,
        },
    ).json()
    response = bid(a, draft["id"], 500)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "LISTING_NOT_FOUND"


def test_bid_03_withdrawn_listing_is_not_found(seller, a, listing_factory):
    listing_id = listing_factory()
    seller.post(f"/api/v1/listings/{listing_id}/withdraw", json={"expectedVersion": 2})
    assert bid(a, listing_id, 500).status_code == 404


def test_bid_03_suspended_auction_is_not_active(a, listing_factory):
    listing_id = listing_factory()
    with SessionLocal() as db:
        db.scalar(select(Auction).where(Auction.listing_id == listing_id)).status = "suspended"
        db.commit()
    response = bid(a, listing_id, 500)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "AUCTION_NOT_ACTIVE"


@pytest.mark.parametrize("amount", [0, -1, 1.5, "100", True, None])
def test_bid_04_amount_must_be_positive_integer(a, listing_factory, amount):
    response = bid(a, listing_factory(), amount)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert count(Bid) == 0


def test_bid_04_over_limit(a, listing_factory):
    response = bid(a, listing_factory(), 10_000_001)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "BID_LIMIT_EXCEEDED"


def test_bid_05_limit_is_accepted(a, listing_factory):
    response = bid(a, listing_factory(start=100), 10_000_000)
    assert response.status_code == 201
    assert response.json()["auction"]["currentPriceYen"] == 100


def test_bid_06_increment_at_1000(a, b, make_client, listing_factory):
    listing_id = listing_factory(start=100)
    bid(a, listing_id, 1000)
    bid(make_client("C"), listing_id, 1000)  # 同額で後から → A が先着、現在の価格 1,000円
    assert auction_of(listing_id).current_price == 1000

    assert bid(b, listing_id, 1099).json()["error"]["details"]["minimumBidYen"] == 1100
    assert bid(b, listing_id, 1100).status_code == 201


# --- 自動入札（AUTO-01〜05） --------------------------------------------------


@pytest.fixture
def a_has_700(a, listing_factory):
    listing_id = listing_factory(start=100)
    assert bid(a, listing_id, 700).status_code == 201
    return listing_id


def test_auto_01_lower_bid_is_outbid(b, a_has_700):
    body = bid(b, a_has_700, 500).json()
    assert body["result"] == "outbid"
    assert body["auction"]["currentPriceYen"] == 510
    assert "700" not in str(body)  # A の最高入札額を返さない


def test_auto_02_higher_bid_leads(b, a_has_700):
    body = bid(b, a_has_700, 715).json()
    assert (body["result"], body["auction"]["currentPriceYen"]) == ("leading", 710)


def test_auto_03_same_amount_earlier_wins(b, a_has_700):
    body = bid(b, a_has_700, 700).json()
    assert (body["result"], body["auction"]["currentPriceYen"]) == ("outbid", 700)


def test_auto_04_leader_raises_without_changing_price(a, a_has_700):
    body = bid(a, a_has_700, 900).json()
    assert (body["result"], body["auction"]["currentPriceYen"]) == ("leading", 100)


def test_auto_05_leader_raise_keeps_price(a, b, a_has_700):
    bid(b, a_has_700, 500)
    body = bid(a, a_has_700, 900).json()
    assert (body["result"], body["auction"]["currentPriceYen"]) == ("leading", 510)


def test_leader_cannot_lower_own_max(a, a_has_700):
    response = bid(a, a_has_700, 650)
    assert response.json()["error"]["code"] == "BID_TOO_LOW"
    assert response.json()["error"]["details"]["minimumBidYen"] == 701


# --- 自動延長（EXT-01〜04） ---------------------------------------------------


@pytest.fixture
def frozen_now(monkeypatch):
    """入札の判定時刻を固定する。"""

    def _freeze(value):
        monkeypatch.setattr(bid_service, "utcnow", lambda: value)

    return _freeze


def prepare_extension(a, listing_factory, auto_extension=True):
    listing_id = listing_factory(start=100, auto_extension=auto_extension)
    bid(a, listing_id, 700)  # A が最高額入札者。次の入札で価格が上がる状態にする
    ends_at = (utcnow() + timedelta(hours=1)).replace(microsecond=0)
    set_ends_at(listing_id, ends_at)
    return listing_id, ends_at


def test_ext_01_just_outside_window_does_not_extend(a, b, listing_factory, frozen_now):
    listing_id, ends_at = prepare_extension(a, listing_factory)
    frozen_now(ends_at - timedelta(minutes=5, seconds=1))
    assert bid(b, listing_id, 500).status_code == 201
    assert auction_of(listing_id).ends_at == ends_at


@pytest.mark.parametrize("before_end", [timedelta(minutes=5), timedelta(microseconds=1)])
def test_ext_02_inside_window_extends(a, b, listing_factory, frozen_now, before_end):
    listing_id, ends_at = prepare_extension(a, listing_factory)
    frozen_now(ends_at - before_end)
    body = bid(b, listing_id, 500).json()
    assert body["auction"]["endsAt"] == (ends_at + timedelta(minutes=5)).isoformat().replace("+00:00", "Z")
    assert auction_of(listing_id).original_ends_at == ends_at  # 延長前の時刻は残す


def test_extension_repeats(a, b, listing_factory, frozen_now):
    listing_id, ends_at = prepare_extension(a, listing_factory)
    frozen_now(ends_at - timedelta(minutes=1))
    bid(b, listing_id, 500)
    frozen_now(ends_at + timedelta(minutes=4))  # 延長後の終了5分前以内
    bid(b, listing_id, 720)
    assert auction_of(listing_id).ends_at == ends_at + timedelta(minutes=10)


def test_ext_03_no_extension_when_disabled(a, b, listing_factory, frozen_now):
    listing_id, ends_at = prepare_extension(a, listing_factory, auto_extension=False)
    frozen_now(ends_at - timedelta(minutes=1))
    bid(b, listing_id, 500)
    assert auction_of(listing_id).ends_at == ends_at


def test_ext_04_leader_raise_does_not_extend(a, listing_factory, frozen_now):
    listing_id, ends_at = prepare_extension(a, listing_factory)
    frozen_now(ends_at - timedelta(minutes=1))
    bid(a, listing_id, 900)
    assert auction_of(listing_id).ends_at == ends_at


def test_time_01_bid_at_or_after_end_is_rejected(a, b, listing_factory, frozen_now):
    listing_id, ends_at = prepare_extension(a, listing_factory)
    for now in (ends_at, ends_at + timedelta(seconds=1)):
        frozen_now(now)
        response = bid(b, listing_id, 500)
        assert response.json()["error"]["code"] == "AUCTION_NOT_ACTIVE"


# --- 即決（END-03） -----------------------------------------------------------


@pytest.mark.parametrize("amount", [3000, 3500])
def test_end_03_buyout(a, listing_factory, amount):
    listing_id = listing_factory(start=1000, buyout=3000)

    response = bid(a, listing_id, amount)

    body = response.json()
    assert response.status_code == 201
    assert body["result"] == "won"
    assert body["auction"]["status"] == "ended"
    assert body["auction"]["currentPriceYen"] == 3000
    assert body["order"]["status"] == "awaiting_payment"
    assert body["order"]["amountYen"] == 3000
    assert body["bid"]["amountYen"] == amount
    with SessionLocal() as db:
        order = db.scalar(select(Order))
        assert (order.amount, order.title, order.shipping_method) == (3000, "かご", "ゆうパケット")
        listing = db.get(Listing, listing_id)
        assert listing.status == "ended"
        assert db.scalar(select(Auction)).end_reason == "buyout"
    assert count(Order) == 1


def test_bid_after_buyout_is_rejected(a, b, listing_factory):
    listing_id = listing_factory(start=1000, buyout=3000)
    bid(a, listing_id, 3000)
    assert bid(b, listing_id, 5000).json()["error"]["code"] == "AUCTION_NOT_ACTIVE"
    assert count(Order) == 1


def test_buyout_wins_even_below_minimum_bid(a, b, make_client, listing_factory):
    """現在の価格＋入札単位が即決価格を超えていても、即決価格以上の入札は即決になる。"""
    listing_id = listing_factory(start=1000, buyout=3000)
    bid(a, listing_id, 2950)
    bid(b, listing_id, 2950)  # 現在の価格 2,950円 → 最低入札額 3,050円
    assert bid(make_client("C"), listing_id, 3000).json()["result"] == "won"


# --- 冪等性（IDEM-01・02・04・05） -------------------------------------------


def test_idem_01_same_key_returns_same_response(a, listing_factory):
    listing_id = listing_factory()
    first = bid(a, listing_id, 500, key="key-1")
    second = bid(a, listing_id, 500, key="key-1")
    assert (second.status_code, second.json()) == (first.status_code, first.json())
    assert count(Bid) == 1


def test_idem_01_buyout_resend_does_not_duplicate_order(a, listing_factory):
    listing_id = listing_factory(start=1000, buyout=3000)
    first = bid(a, listing_id, 3000, key="buy")
    second = bid(a, listing_id, 3000, key="buy")
    assert second.json() == first.json()
    assert (count(Bid), count(Order)) == (1, 1)


def test_idem_02_same_key_different_body(a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500, key="key-1")
    response = bid(a, listing_id, 600, key="key-1")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"
    assert count(Bid) == 1


def test_idem_04_rejection_is_fixed(a, b, listing_factory):
    listing_id = listing_factory(start=100)
    first = bid(a, listing_id, 50, key="low")
    assert first.json()["error"]["code"] == "BID_TOO_LOW"
    bid(b, listing_id, 1000)  # 状態が変わる
    second = bid(a, listing_id, 50, key="low")
    assert (second.status_code, second.json()) == (first.status_code, first.json())


def test_idem_05_resend_returns_original_leading(a, b, listing_factory):
    listing_id = listing_factory()
    first = bid(a, listing_id, 500, key="a-1")
    assert first.json()["result"] == "leading"
    bid(b, listing_id, 900)  # B が上回る
    assert bid(a, listing_id, 500, key="a-1").json() == first.json()


def test_same_key_is_scoped_per_user(a, b, listing_factory):
    listing_id = listing_factory()
    assert bid(a, listing_id, 500, key="shared").status_code == 201
    assert bid(b, listing_id, 900, key="shared").status_code == 201


@pytest.mark.parametrize("headers", [{}, {"Idempotency-Key": ""}, {"Idempotency-Key": "x" * 65}, {"Idempotency-Key": "a b"}])
def test_idempotency_key_is_required(a, listing_factory, headers):
    response = a.post(f"/api/v1/listings/{listing_factory()}/bids", json={"amountYen": 500}, headers=headers)
    assert response.status_code == 422
    assert count(Bid) == 0


# --- 認証 ---------------------------------------------------------------------


def test_bid_requires_login(make_client, listing_factory):
    response = bid(make_client(), listing_factory(), 500)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_auth_02_suspended_user_cannot_bid(a, listing_factory):
    listing_id = listing_factory()
    with SessionLocal() as db:
        db.scalar(select(User).where(User.display_name == "A")).status = "suspended"
        db.commit()
    assert bid(a, listing_id, 500).status_code == 401
    assert count(Bid) == 0


# --- 出品 API との連携 --------------------------------------------------------


def test_listing_detail_reflects_bids(a, b, make_client, listing_factory):
    listing_id = listing_factory(start=100)
    bid(a, listing_id, 700)
    bid(b, listing_id, 500)

    detail = make_client().get(f"/api/v1/listings/{listing_id}").json()["auction"]

    assert (detail["currentPriceYen"], detail["bidCount"], detail["minimumBidYen"]) == (510, 2, 520)
    assert "highestBidderId" not in detail


def test_withdraw_with_bids_is_rejected(seller, a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    response = seller.post(f"/api/v1/listings/{listing_id}/withdraw", json={"expectedVersion": 2})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "HAS_BIDS"


def test_search_sort_by_price_and_bids(a, b, make_client, listing_factory):
    cheap = listing_factory(start=100)
    expensive = listing_factory(start=5000)
    popular = listing_factory(start=1000)
    bid(a, popular, 2000)
    bid(b, popular, 3000)  # 現在の価格 2,100円、入札2件
    guest = make_client()

    def ids(sort):
        return [i["id"] for i in guest.get("/api/v1/listings", params={"sort": sort}).json()["items"]]

    assert ids("price_asc") == [cheap, popular, expensive]
    assert ids("price_desc") == [expensive, popular, cheap]
    assert ids("bids")[0] == popular


# --- 同時入札（CON-01） -------------------------------------------------------


def test_con_01_concurrent_bids_are_serialized(make_client, listing_factory):
    listing_id = listing_factory(start=100)
    clients = [make_client(f"bidder{i}") for i in range(8)]
    results = []

    def run(client, amount):
        results.append(bid(client, listing_id, amount))

    threads = [threading.Thread(target=run, args=(c, 200 + i * 100)) for i, c in enumerate(clients)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    statuses = sorted(r.status_code for r in results)
    assert all(s in (201, 409) for s in statuses), [r.json() for r in results]
    with SessionLocal() as db:
        auction = db.scalar(select(Auction).where(Auction.listing_id == listing_id))
        accepted = db.scalar(select(func.count()).select_from(Bid))
        assert auction.bid_count == accepted == statuses.count(201)
        # 集計列が履歴から計算し直した値と一致すること
        bids = db.scalars(select(Bid).order_by(Bid.id)).all()
        expected = compute_price(100, [AcceptedBid(x.bidder_id, x.max_amount, x.id) for x in bids])
        assert (auction.current_price, auction.highest_bidder_id) == (expected.current_price, expected.leader_id)
    assert count(BidRequest) == len(results)
