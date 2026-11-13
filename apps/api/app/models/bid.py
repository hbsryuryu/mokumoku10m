"""入札と、入札リクエストの冪等性の記録（BID-001）。

設計: docs/architecture/database-schema.md、docs/architecture/auction-bid-transaction.md
"""

from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UTCDateTime, utcnow
from app.models.listing import PRICE_MAX

IDEMPOTENCY_KEY_MAX = 64


class Bid(Base):
    """受付済みの入札。追記のみで、通常は更新・削除しない（AGENTS.md）。

    `max_amount` は本人が入力した最高入札額で、本人以外には見せない（ADR-0007）。
    受付順は `id`（単調増加）で表す。
    """

    __tablename__ = "bids"
    __table_args__ = (
        CheckConstraint(f"max_amount BETWEEN 1 AND {PRICE_MAX}", name="max_amount_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    auction_id: Mapped[int] = mapped_column(ForeignKey("auctions.id"), index=True)
    bidder_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    max_amount: Mapped[int] = mapped_column(Integer)
    accepted_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class BidRequest(Base):
    """入札リクエストの冪等性の記録。

    同じ会員・オークション・冪等性キーの再送には、保存した HTTP ステータスと本文をそのまま返す。
    成功だけでなく、最低額未満などの業務上の拒否も保存する（トランザクション設計 4章）。
    """

    __tablename__ = "bid_requests"
    __table_args__ = (UniqueConstraint("auction_id", "user_id", "idempotency_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    auction_id: Mapped[int] = mapped_column(ForeignKey("auctions.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    idempotency_key: Mapped[str] = mapped_column(String(IDEMPOTENCY_KEY_MAX))
    request_hash: Mapped[str] = mapped_column(String(64))
    status_code: Mapped[int] = mapped_column(Integer)
    response_body: Mapped[str] = mapped_column(Text)
    bid_id: Mapped[int | None] = mapped_column(ForeignKey("bids.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
