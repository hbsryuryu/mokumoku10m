"""Feature BID-001: 入札の受付（docs/architecture/auction-bid-transaction.md 3章、docs/api/openapi.md）。

1つのトランザクションの中で、次の順に処理する。

1. オークションの悲観ロックを取る（app.locking）
2. 冪等性キーの記録を探す。あれば保存した応答をそのまま返す（本文が違えば IDEMPOTENCY_KEY_REUSED）
3. ロック取得後の時刻で、開催中か・出品者本人でないか・金額を確認する（業務上の拒否も記録して固定する）
4. 即決価格以上なら、即決で落札（オークション終了・Order 作成）
5. それ以外は入札を追記し、自動入札で現在の価格を計算し直す。価格が上がり、終了5分前以内なら自動延長
6. 冪等性の記録を保存してコミットする（コミットできたときだけ成功を返す）

時刻はロック取得後の API サーバーの時刻を使う。サーバー1台・SQLite3 の間はこれを DB 基準の時刻とみなし、
PostgreSQL に移行するときに DB の時刻（clock_timestamp）を使うか見直す。
"""

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import timedelta

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.bids.pricing import AcceptedBid, compute_price, minimum_bid_for
from app.db import utcnow
from app.errors import ApiError, error_body, listing_not_found
from app.locking import lock_auction
from app.models import Auction, Bid, BidRequest, Listing, Order, User
from app.models.bid import IDEMPOTENCY_KEY_MAX
from app.models.listing import PRICE_MAX

AUTO_EXTENSION_WINDOW = timedelta(minutes=5)  # ADR-0007 §4
AUTO_EXTENSION_LENGTH = timedelta(minutes=5)
IDEMPOTENCY_KEY_PATTERN = re.compile(rf"^[A-Za-z0-9_\-]{{1,{IDEMPOTENCY_KEY_MAX}}}$")


@dataclass(frozen=True)
class BidOutcome:
    """API が返す HTTP ステータスと本文（冪等性の記録にもこのまま保存する）。"""

    status_code: int
    body: dict


# --- 入力の確認 ---------------------------------------------------------------


def validate_idempotency_key(key: str | None) -> str:
    if not key or not IDEMPOTENCY_KEY_PATTERN.match(key):
        raise ApiError(
            422,
            "VALIDATION_ERROR",
            "入力内容を確認してください",
            {
                "fields": [
                    {
                        "field": "Idempotency-Key",
                        "message": f"英数字・ハイフン・アンダースコアで1〜{IDEMPOTENCY_KEY_MAX}文字のヘッダーが必要です",
                    }
                ]
            },
        )
    return key


def request_hash(amount_yen: int) -> str:
    """同じ内容のリクエストかを比べるためのハッシュ（JSON の書き方の違いには影響されない）。"""
    canonical = json.dumps({"amountYen": amount_yen}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def rejection(status_code: int, code: str, message: str, details: dict | None = None) -> BidOutcome:
    return BidOutcome(status_code, error_body(code, message, details))


# --- 受付 ---------------------------------------------------------------------


def place_bid(
    db: DbSession, bidder: User, listing_id: int, amount_yen: int, idempotency_key: str
) -> BidOutcome:
    listing = db.get(Listing, listing_id)
    # 下書き・取り下げなど、本人以外に見えない出品は「存在しない」と同じ扱い（出品 API と同じ）。
    visible = listing is not None and (
        listing.status in ("published", "ended") or listing.seller_id == bidder.id
    )
    if not visible:
        raise listing_not_found()
    if listing.auction is None:
        raise ApiError(status.HTTP_409_CONFLICT, "AUCTION_NOT_ACTIVE", "このオークションは開催していません")
    auction_id = listing.auction.id
    bidder_id = bidder.id

    # 1. ロック（ここから先は、同じオークションへのほかの入札・終了処理・取り下げと直列になる）
    auction = lock_auction(db, auction_id)
    listing = db.get(Listing, listing_id, populate_existing=True)
    req_hash = request_hash(amount_yen)

    # 2. 冪等性：同じキーの記録があれば、保存した結果をそのまま返す
    previous = db.scalar(
        select(BidRequest).where(
            BidRequest.auction_id == auction_id,
            BidRequest.user_id == bidder_id,
            BidRequest.idempotency_key == idempotency_key,
        )
    )
    if previous is not None:
        db.rollback()
        if previous.request_hash != req_hash:
            raise ApiError(
                status.HTTP_409_CONFLICT,
                "IDEMPOTENCY_KEY_REUSED",
                "同じ冪等性キーが、別の内容の入札に使われています",
            )
        return BidOutcome(previous.status_code, json.loads(previous.response_body))

    # 3〜5. 判定と受付
    now = utcnow()
    outcome, bid = _evaluate(db, auction, listing, bidder_id, amount_yen, now)

    # 6. 結果を記録してコミット
    db.add(
        BidRequest(
            auction_id=auction_id,
            user_id=bidder_id,
            idempotency_key=idempotency_key,
            request_hash=req_hash,
            status_code=outcome.status_code,
            response_body=json.dumps(outcome.body, ensure_ascii=False),
            bid_id=bid.id if bid else None,
            created_at=now,
        )
    )
    db.commit()
    return outcome


def _evaluate(
    db: DbSession, auction: Auction, listing: Listing, bidder_id: int, amount_yen: int, now
) -> tuple[BidOutcome, Bid | None]:
    if listing.status != "published" or auction.status != "active" or not now < auction.ends_at:
        return rejection(
            status.HTTP_409_CONFLICT, "AUCTION_NOT_ACTIVE", "このオークションは入札を受け付けていません"
        ), None
    if listing.seller_id == bidder_id:
        return rejection(status.HTTP_403_FORBIDDEN, "SELLER_CANNOT_BID", "自分の出品には入札できません"), None
    if amount_yen > PRICE_MAX:
        return rejection(
            422, "BID_LIMIT_EXCEEDED", "入札額が上限を超えています", {"maximumBidYen": PRICE_MAX}
        ), None

    bids = list(
        db.scalars(select(Bid).where(Bid.auction_id == auction.id).order_by(Bid.id))
    )
    before = compute_price(auction.start_price, _accepted(bids))

    # 即決（ADR-0007 §5）：即決価格以上なら、最低入札額にかかわらず即決価格で落札する
    if auction.buyout_price is not None and amount_yen >= auction.buyout_price:
        return _buyout(db, auction, listing, bidder_id, amount_yen, now)

    required = minimum_bid_for(bidder_id, auction.start_price, before)
    if amount_yen < required:
        return rejection(
            status.HTTP_409_CONFLICT,
            "BID_TOO_LOW",
            "入札額が最低入札額に足りません",
            {"minimumBidYen": required, "currentPriceYen": before.current_price},
        ), None

    bid = Bid(auction_id=auction.id, bidder_id=bidder_id, max_amount=amount_yen, accepted_at=now)
    db.add(bid)
    db.flush()
    after = compute_price(auction.start_price, _accepted([*bids, bid]))

    # 自動延長（ADR-0007 §4）：現在の価格が上がり、終了5分前から終了までの間なら5分延長する
    price_went_up = before.bid_count > 0 and after.current_price > before.current_price
    if auction.auto_extension and price_went_up and auction.ends_at - AUTO_EXTENSION_WINDOW <= now:
        auction.ends_at = auction.ends_at + AUTO_EXTENSION_LENGTH

    auction.current_price = after.current_price
    auction.highest_bidder_id = after.leader_id
    auction.bid_count = after.bid_count

    result = "leading" if after.leader_id == bidder_id else "outbid"
    return BidOutcome(status.HTTP_201_CREATED, _success_body(bid, result, auction, None)), bid


def _buyout(
    db: DbSession, auction: Auction, listing: Listing, bidder_id: int, amount_yen: int, now
) -> tuple[BidOutcome, Bid]:
    bid = Bid(auction_id=auction.id, bidder_id=bidder_id, max_amount=amount_yen, accepted_at=now)
    db.add(bid)
    price = auction.buyout_price
    auction.current_price = price
    auction.highest_bidder_id = bidder_id
    auction.bid_count += 1
    auction.status = "ended"
    auction.end_reason = "buyout"
    auction.ended_at = now
    listing.status = "ended"
    listing.version += 1
    listing.updated_at = now
    order = Order(
        auction_id=auction.id,
        listing_id=listing.id,
        buyer_id=bidder_id,
        seller_id=listing.seller_id,
        amount=price,
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
    return BidOutcome(status.HTTP_201_CREATED, _success_body(bid, "won", auction, order)), bid


def _accepted(bids: list[Bid]) -> list[AcceptedBid]:
    return [AcceptedBid(bidder_id=b.bidder_id, max_amount=b.max_amount, order=b.id) for b in bids]


def _iso(value) -> str:
    return value.isoformat().replace("+00:00", "Z")


def _success_body(bid: Bid, result: str, auction: Auction, order: Order | None) -> dict:
    """成功時の本文（docs/api/openapi.md「入札成功レスポンス」）。ID は文字列。"""
    return {
        "bid": {"id": str(bid.id), "amountYen": bid.max_amount, "acceptedAt": _iso(bid.accepted_at)},
        "result": result,
        "auction": {
            "status": auction.status,
            "currentPriceYen": auction.current_price,
            "endsAt": _iso(auction.ends_at),
        },
        "order": (
            {"id": str(order.id), "status": order.status, "amountYen": order.amount} if order else None
        ),
    }
