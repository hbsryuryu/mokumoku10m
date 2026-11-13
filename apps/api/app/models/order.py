"""落札後の取引（Order）。即決（BID-001）と終了処理（AUC-001）で作る。

取引時点の商品情報・配送条件をスナップショットとして保存する（AGENTS.md、仕様書 5.7）。
1オークションに1件だけ（`auction_id` は一意）。手数料（ADR-0009）は提案中のため、まだ持たない。
"""

from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UTCDateTime, utcnow
from app.models.listing import PRICE_MAX

ORDER_STATUSES = (
    "awaiting_payment",
    "paid",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "disputed",
    "refunded",
)


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(f"amount BETWEEN 1 AND {PRICE_MAX}", name="amount_range"),
        CheckConstraint(f"status IN {ORDER_STATUSES}", name="status"),
        CheckConstraint("buyer_id <> seller_id", name="buyer_is_not_seller"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    auction_id: Mapped[int] = mapped_column(ForeignKey("auctions.id"), unique=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"))
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    # 落札価格（送料・手数料を含まない）
    amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="awaiting_payment")
    # 取引時点のスナップショット（出品の内容が後から変わっても、取引の内容は変わらない）
    title: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(Text)
    condition: Mapped[str] = mapped_column(String(16))
    shipping_payer: Mapped[str] = mapped_column(String(16))
    shipping_method: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
