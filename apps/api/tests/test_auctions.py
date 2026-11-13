"""Feature AUC-001: 終了処理・早期終了・取引一覧のテスト（ケース ID は docs/testing/auction-test-cases.md）。"""

import asyncio
import threading
import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

import app.main as main_module
from app.auctions import service as auction_service
from app.config import Settings
from app.db import SessionLocal, utcnow
from app.jobs import finalize as finalize_job
from app.main import create_app
from app.models import Auction, Bid, Category, Listing, Order, User


@pytest.fixture
def make_client():
    settings = Settings(app_env="local", dev_login_enabled=True, finalizer_interval_seconds=0)

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

    def _make(start=100, buyout=None) -> int:
        body = {
            "title": "かご", "description": "説明", "categoryId": category_id, "condition": "new",
            "shippingPayer": "buyer", "shippingMethod": "ゆうパケット",
            "startPriceYen": start, "buyoutPriceYen": buyout, "durationHours": 24,
        }
        created = seller.post("/api/v1/listings", json=body).json()
        assert seller.post(f"/api/v1/listings/{created['id']}/publish", json={"expectedVersion": 1}).status_code == 200
        return created["id"]

    return _make


def bid(client, listing_id, amount):
    return client.post(
        f"/api/v1/listings/{listing_id}/bids", json={"amountYen": amount},
        headers={"Idempotency-Key": uuid.uuid4().hex},
    )


def expire(listing_id: int, ago=timedelta(seconds=1)):
    """終了時刻を過去にする（開始時刻もそれより前にずらす）。"""
    now = utcnow()
    with SessionLocal() as db:
        auction = db.scalar(select(Auction).where(Auction.listing_id == listing_id))
        auction.starts_at = now - timedelta(days=1)
        auction.ends_at = now - ago
        auction.original_ends_at = now - ago
        db.commit()


def state(listing_id: int):
    with SessionLocal() as db:
        auction = db.scalar(select(Auction).where(Auction.listing_id == listing_id))
        listing = db.get(Listing, listing_id)
        orders = db.scalars(select(Order).where(Order.listing_id == listing_id)).all()
        return auction, listing, orders


def set_suspended(listing_id: int):
    with SessionLocal() as db:
        db.get(Listing, listing_id).status = "suspended"
        db.commit()


# --- 通常の終了（END-01・02・05） ---------------------------------------------


def test_not_finalized_before_end(a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    assert finalize_job.run_once() == []
    auction, listing, orders = state(listing_id)
    assert (auction.status, listing.status, orders) == ("active", "published", [])


def test_end_01_no_bids(listing_factory):
    listing_id = listing_factory()
    expire(listing_id)

    results = finalize_job.run_once()

    assert [r.outcome for r in results] == ["unsold"]
    auction, listing, orders = state(listing_id)
    assert (auction.status, auction.end_reason, listing.status) == ("ended", "expired", "ended")
    assert auction.highest_bidder_id is None and orders == []


def test_end_02_highest_bidder_wins_at_current_price(a, b, listing_factory):
    listing_id = listing_factory(start=100)
    bid(a, listing_id, 700)
    bid(b, listing_id, 500)
    expire(listing_id)

    [result] = finalize_job.run_once()

    assert result.outcome == "sold"
    auction, listing, [order] = state(listing_id)
    with SessionLocal() as db:
        buyer = db.get(User, order.buyer_id)
    assert (buyer.display_name, order.amount, order.status) == ("A", 510, "awaiting_payment")
    assert (order.title, order.shipping_payer, order.shipping_method) == ("かご", "buyer", "ゆうパケット")
    assert order.seller_id == listing.seller_id
    assert (auction.current_price, auction.bid_count) == (510, 2)


def test_order_keeps_snapshot_after_listing_changes(a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    expire(listing_id)
    finalize_job.run_once()
    with SessionLocal() as db:
        db.get(Listing, listing_id).title = "変更後のタイトル"
        db.commit()
    assert state(listing_id)[2][0].title == "かご"


def test_end_05_rerun_does_not_duplicate(a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    expire(listing_id)
    finalize_job.run_once()

    with SessionLocal() as db:
        auction_id = db.scalar(select(Auction.id).where(Auction.listing_id == listing_id))
        assert auction_service.finalize_auction(db, auction_id).outcome == "already_closed"
    assert finalize_job.run_once() == []
    assert len(state(listing_id)[2]) == 1


def test_end_05_parallel_finalize_creates_one_order(a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    expire(listing_id)
    with SessionLocal() as db:
        auction_id = db.scalar(select(Auction.id).where(Auction.listing_id == listing_id))
    outcomes = []

    def run():
        with SessionLocal() as db:
            outcomes.append(auction_service.finalize_auction(db, auction_id).outcome)

    threads = [threading.Thread(target=run) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(outcomes) == ["already_closed"] * 5 + ["sold"]
    assert len(state(listing_id)[2]) == 1


def test_bid_after_end_is_rejected_and_listing_shows_result(a, b, make_client, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    expire(listing_id)
    finalize_job.run_once()

    assert bid(b, listing_id, 900).json()["error"]["code"] == "AUCTION_NOT_ACTIVE"
    detail = make_client().get(f"/api/v1/listings/{listing_id}").json()
    assert (detail["status"], detail["auction"]["status"], detail["auction"]["endReason"]) == ("ended", "ended", "expired")
    # 終了した出品は一覧（開催中のみ）には出ない
    assert listing_id not in [i["id"] for i in make_client().get("/api/v1/listings").json()["items"]]


def test_one_failure_does_not_stop_others(listing_factory, monkeypatch):
    first, second = listing_factory(), listing_factory()
    expire(first)
    expire(second)
    original = auction_service.finalize_auction
    calls = []

    def flaky(db, auction_id):
        calls.append(auction_id)
        if len(calls) == 1:
            raise RuntimeError("一時的な障害")
        return original(db, auction_id)

    monkeypatch.setattr(auction_service, "finalize_auction", flaky)
    with SessionLocal() as db:
        results = auction_service.finalize_due_auctions(db)
    assert len(calls) == 2 and len(results) == 1
    # 失敗した1件は、次の実行で処理される
    monkeypatch.setattr(auction_service, "finalize_auction", original)
    assert len(finalize_job.run_once()) == 1


# --- 運営停止（END-06） -------------------------------------------------------


def test_end_06_suspended_before_end_stays_suspended(a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    set_suspended(listing_id)
    with SessionLocal() as db:
        auction_id = db.scalar(select(Auction.id).where(Auction.listing_id == listing_id))
        assert auction_service.finalize_auction(db, auction_id).outcome == "still_suspended"
    auction, listing, orders = state(listing_id)
    assert (listing.status, orders) == ("suspended", [])


def test_end_06_suspended_after_end_is_cancelled(a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    set_suspended(listing_id)
    expire(listing_id)

    [result] = finalize_job.run_once()

    assert result.outcome == "cancelled"
    auction, listing, orders = state(listing_id)
    assert (auction.status, auction.end_reason, listing.status, orders) == ("cancelled", "cancelled", "cancelled", [])
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Bid)) == 1  # 入札履歴は残す


# --- 早期終了（END-04） -------------------------------------------------------


def test_end_04_early_end_with_bids(seller, a, b, listing_factory):
    listing_id = listing_factory(start=100)
    bid(a, listing_id, 700)
    bid(b, listing_id, 500)

    response = seller.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 2})

    assert response.status_code == 200
    body = response.json()
    assert (body["status"], body["auction"]["status"], body["auction"]["endReason"]) == ("ended", "ended", "early_end")
    [order] = state(listing_id)[2]
    assert order.amount == 510
    assert a.get("/api/v1/me/orders").json()[0]["role"] == "buyer"


def test_end_04_early_end_without_bids(seller, listing_factory):
    listing_id = listing_factory()
    response = seller.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 2})
    assert response.json()["auction"]["endReason"] == "early_end"
    assert state(listing_id)[2] == []


def test_early_end_requires_owner_and_version(seller, a, listing_factory):
    listing_id = listing_factory()
    assert a.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 2}).status_code == 404
    response = seller.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 1})
    assert response.json()["error"]["code"] == "VERSION_CONFLICT"
    assert state(listing_id)[0].status == "active"


def test_early_end_twice_is_rejected(seller, listing_factory):
    listing_id = listing_factory()
    seller.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 2})
    response = seller.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 3})
    assert response.json()["error"]["code"] == "LISTING_NOT_EDITABLE"


def test_early_end_after_end_time_finalizes_normally(seller, a, listing_factory):
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    expire(listing_id)
    response = seller.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 2})
    assert response.json()["error"]["code"] == "AUCTION_NOT_ACTIVE"
    auction, _, orders = state(listing_id)
    assert (auction.end_reason, len(orders)) == ("expired", 1)


# --- 競合（CON-03・04） ------------------------------------------------------


def test_con_03_bids_and_finalize_after_end(make_client, a, listing_factory):
    """終了時刻を過ぎたあと、入札と終了処理が同時に来ても、終了後の入札は1件も受け付けない。"""
    listing_id = listing_factory()
    bid(a, listing_id, 500)
    expire(listing_id)
    bidders = [make_client(f"late{i}") for i in range(5)]
    responses = []

    def late_bid(client):
        responses.append(bid(client, listing_id, 900))

    threads = [threading.Thread(target=late_bid, args=(c,)) for c in bidders]
    threads.append(threading.Thread(target=finalize_job.run_once))
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert all(r.json()["error"]["code"] == "AUCTION_NOT_ACTIVE" for r in responses)
    finalize_job.run_once()
    auction, _, orders = state(listing_id)
    assert (auction.bid_count, len(orders), orders[0].amount) == (1, 1, 100)


def test_con_04_early_end_and_bids_are_consistent(seller, make_client, listing_factory):
    """早期終了と入札が同時に来ても、落札者・落札価格は確定した入札と一致し、終了後の入札はない。"""
    listing_id = listing_factory(start=100)
    bidders = [make_client(f"bidder{i}") for i in range(5)]
    responses = []

    def place(client, amount):
        responses.append(bid(client, listing_id, amount))

    threads = [threading.Thread(target=place, args=(c, 200 + i * 100)) for i, c in enumerate(bidders)]
    threads.append(
        threading.Thread(
            target=lambda: seller.post(f"/api/v1/listings/{listing_id}/end-early", json={"expectedVersion": 2})
        )
    )
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    auction, listing, orders = state(listing_id)
    assert auction.status == "ended"
    with SessionLocal() as db:
        bids = db.scalars(select(Bid).where(Bid.auction_id == auction.id)).all()
    assert all(b.accepted_at <= auction.ended_at for b in bids)
    assert auction.bid_count == len(bids) == sum(r.status_code == 201 for r in responses)
    if bids:
        [order] = orders
        assert (order.buyer_id, order.amount) == (auction.highest_bidder_id, auction.current_price)
    else:
        assert orders == []


# --- 取引一覧 -----------------------------------------------------------------


def test_my_orders_for_buyer_and_seller(seller, a, b, listing_factory):
    listing_id = listing_factory(start=1000, buyout=3000)
    bid(a, listing_id, 3000)

    [as_buyer] = a.get("/api/v1/me/orders").json()
    [as_seller] = seller.get("/api/v1/me/orders").json()

    assert (as_buyer["role"], as_buyer["amountYen"], as_buyer["listingId"]) == ("buyer", 3000, listing_id)
    assert as_seller["role"] == "seller"
    assert isinstance(as_buyer["id"], str)
    assert b.get("/api/v1/me/orders").json() == []


def test_my_orders_requires_login(make_client):
    assert make_client().get("/api/v1/me/orders").status_code == 401


# --- 定期実行 -----------------------------------------------------------------


def test_periodic_runner_finalizes_due_auctions(listing_factory):
    listing_id = listing_factory()
    expire(listing_id)

    async def run_briefly():
        task = asyncio.create_task(finalize_job.run_forever(interval_seconds=3600))
        for _ in range(100):
            await asyncio.sleep(0.05)
            if state(listing_id)[0].status == "ended":
                break
        task.cancel()

    asyncio.run(run_briefly())
    assert state(listing_id)[0].status == "ended"


def test_runner_is_started_only_when_interval_is_positive(monkeypatch):
    started = []

    async def fake_run_forever(interval):
        started.append(interval)
        await asyncio.sleep(3600)

    monkeypatch.setattr(main_module, "run_forever", fake_run_forever)
    with TestClient(create_app(Settings(app_env="local", finalizer_interval_seconds=0))):
        pass
    with TestClient(create_app(Settings(app_env="local", finalizer_interval_seconds=7))):
        pass
    assert started == [7]


@pytest.mark.parametrize("offset, expected", [(timedelta(0), "unsold"), (-timedelta(microseconds=1), "not_yet")])
def test_finalize_boundary_at_end_time(listing_factory, monkeypatch, offset, expected):
    """終了時刻ちょうどなら終了し、1マイクロ秒前ならまだ終了しない（入札は `< ends_at` まで）。"""
    listing_id = listing_factory()
    auction = state(listing_id)[0]
    monkeypatch.setattr(auction_service, "utcnow", lambda: auction.ends_at + offset)
    with SessionLocal() as db:
        assert auction_service.finalize_auction(db, auction.id).outcome == expected
