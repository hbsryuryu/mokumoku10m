"""Feature AUC-001: オークションの終了・落札（docs/architecture/auction-bid-transaction.md 5章）。

- 終了処理（finalize_auction）：終了時刻を過ぎたオークションを確定し、入札があれば Order を作る
- 早期終了（end_early）：出品者が終了日時より前に締め切る（ADR-0007 §6）

どちらも Auction -> Listing の順にロックを取り、ロック取得後の時刻と状態で判定する。
入札と同じロックなので、入札と終了処理がぶつかっても、先にロックを取ったほうが先に確定する。
Order は `auction_id` が一意なので、同じオークションから二重に作られない。
"""

import logging
from dataclasses import dataclass
from datetime import datetime

from fastapi import status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session as DbSession

from app.bids.pricing import AcceptedBid, compute_price
from app.db import utcnow
from app.errors import ApiError, listing_not_found
from app.listings.service import load_listing, not_editable, version_conflict
from app.locking import lock_auction_with_listing
from app.models import Auction, Bid, Listing, Order, User

logger = logging.getLogger(__name__)

# 終了処理の結果
NOT_FOUND = "not_found"
NOT_YET = "not_yet"  # 終了時刻前
ALREADY_CLOSED = "already_closed"  # すでに終了・キャンセル済み（再実行）
STILL_SUSPENDED = "still_suspended"  # 運営停止中で、終了時刻前
CANCELLED = "cancelled"  # 運営停止中に終了時刻を過ぎた
SOLD = "sold"  # 落札者あり（Order 作成）
UNSOLD = "unsold"  # 入札なしで終了


@dataclass(frozen=True)
class FinalizeResult:
    auction_id: int
    outcome: str
    order_id: int | None = None


def _close(auction: Auction, listing: Listing, now: datetime, reason: str) -> None:
    auction.status = "ended"
    auction.end_reason = reason
    auction.ended_at = now
    listing.status = "ended"
    listing.version += 1
    listing.updated_at = now


def _settle(db: DbSession, auction: Auction, listing: Listing, now: datetime) -> Order | None:
    """入札の履歴から落札者と落札価格を確定し、落札者がいれば Order を作る。

    集計列ではなく、ロック下で入札の履歴から計算し直す（履歴が正。トランザクション設計 2章）。
    """
    bids = db.scalars(select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.id)).all()
    price = compute_price(
        auction.start_price, [AcceptedBid(b.bidder_id, b.max_amount, b.id) for b in bids]
    )
    auction.current_price = price.current_price
    auction.highest_bidder_id = price.leader_id
    auction.bid_count = price.bid_count
    if price.leader_id is None:
        return None
    order = Order(
        auction_id=auction.id,
        listing_id=listing.id,
        buyer_id=price.leader_id,
        seller_id=listing.seller_id,
        amount=price.current_price,
        status="awaiting_payment",
        title=listing.title,
        description=listing.description,
        condition=listing.condition,
        shipping_payer=listing.shipping_payer,
        shipping_method=listing.shipping_method,
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    db.flush()
    return order


def finalize_auction(db: DbSession, auction_id: int) -> FinalizeResult:
    """1件のオークションの終了処理。何度実行しても結果は同じ（冪等）。"""
    locked = lock_auction_with_listing(db, auction_id)
    if locked is None:
        db.rollback()
        return FinalizeResult(auction_id, NOT_FOUND)
    auction, listing = locked
    now = utcnow()

    # 1. すでに終わっているものは、そのまま（Order を二重に作らない）
    if "cancelled" in (auction.status, listing.status) or auction.status == "ended":
        db.rollback()
        return FinalizeResult(auction_id, ALREADY_CLOSED)

    # 2. 運営停止中：終了時刻前は停止のまま、過ぎたらキャンセル（落札者・Order なし、入札履歴は残す）
    if "suspended" in (auction.status, listing.status):
        if now < auction.ends_at:
            db.rollback()
            return FinalizeResult(auction_id, STILL_SUSPENDED)
        auction.status = "cancelled"
        auction.end_reason = "cancelled"
        auction.ended_at = now
        listing.status = "cancelled"
        listing.version += 1
        listing.updated_at = now
        # TODO(MOD-002): 監査記録、TODO(NTF): 関係者への通知（Outbox）
        db.commit()
        return FinalizeResult(auction_id, CANCELLED)

    # 3. 通常の終了：公開中・開催中で、終了時刻を過ぎたもの
    if listing.status != "published" or auction.status != "active" or now < auction.ends_at:
        db.rollback()
        return FinalizeResult(auction_id, NOT_YET)
    _close(auction, listing, now, "expired")
    order = _settle(db, auction, listing, now)
    # TODO(NTF): 落札・終了の通知（Outbox）を同じトランザクションで作る
    db.commit()
    return FinalizeResult(auction_id, SOLD if order else UNSOLD, order.id if order else None)


def due_auction_ids(db: DbSession) -> list[int]:
    """終了処理の候補。ここでは候補を探すだけで、確定は finalize_auction がロック下で判断する。"""
    statement = (
        select(Auction.id)
        .join(Listing, Listing.id == Auction.listing_id)
        .where(
            Auction.ends_at <= utcnow(),
            or_(Auction.status.in_(("active", "suspended")), Listing.status == "suspended"),
            Auction.status.not_in(("ended", "cancelled")),
        )
        .order_by(Auction.ends_at, Auction.id)
    )
    ids = list(db.scalars(statement))
    db.rollback()  # 読み込みだけのトランザクションを終える（このあとロックを取るため）
    return ids


def finalize_due_auctions(db: DbSession) -> list[FinalizeResult]:
    """終了時刻を過ぎたオークションをすべて処理する。1件が失敗しても、ほかは続ける。"""
    results = []
    for auction_id in due_auction_ids(db):
        try:
            results.append(finalize_auction(db, auction_id))
        except Exception:
            db.rollback()
            logger.exception("終了処理に失敗しました（auction_id=%s）。次回の実行で再試行します", auction_id)
    return results


def end_early(db: DbSession, seller: User, listing_id: int, expected_version: int) -> Listing:
    """出品者による早期終了（ADR-0007 §6）。入札があれば、その時点の最高額入札者が現在の価格で落札する。"""
    listing = load_listing(db, listing_id)
    if listing is None or listing.seller_id != seller.id:
        raise listing_not_found()
    if listing.auction is None:
        raise not_editable(listing.status)
    auction_id = listing.auction.id

    auction, listing = lock_auction_with_listing(db, auction_id)
    now = utcnow()
    if listing.status != "published" or auction.status != "active":
        db.rollback()
        raise not_editable(listing.status)
    if not now < auction.ends_at:
        # すでに終了時刻を過ぎている：早期終了ではなく、通常の終了として確定させる
        db.rollback()
        finalize_auction(db, auction_id)
        raise ApiError(
            status.HTTP_409_CONFLICT,
            "AUCTION_NOT_ACTIVE",
            "このオークションはすでに終了時刻を過ぎています",
        )
    if listing.version != expected_version:
        db.rollback()
        raise version_conflict(listing.version)

    _close(auction, listing, now, "early_end")
    _settle(db, auction, listing, now)
    db.commit()
    return load_listing(db, listing_id)
