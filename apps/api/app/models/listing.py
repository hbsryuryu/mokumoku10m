"""出品・オークション・カテゴリのテーブル（LST-004）。

仮の値は ADR-0008、入札・終了のルールは ADR-0007、出品の編集・取り下げは ADR-0004 を参照。
設計: docs/architecture/database-schema.md
"""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime, utcnow
from app.models.user import User

# ADR-0008 の仮の値
TITLE_MAX = 60
DESCRIPTION_MAX = 500
SHIPPING_METHOD_MAX = 80
PRICE_MAX = 10_000_000

CONDITIONS = ("new", "like_new", "some_wear", "worn")  # 表示名は CONDITION_LABELS
CONDITION_LABELS = {
    "new": "新品・未使用",
    "like_new": "目立った傷や汚れなし",
    "some_wear": "やや傷や汚れあり",
    "worn": "傷や汚れあり",
}
SHIPPING_PAYERS = ("seller", "buyer")
LISTING_STATUSES = ("draft", "published", "ended", "suspended", "cancelled")
AUCTION_STATUSES = ("scheduled", "active", "ended", "suspended", "cancelled")
AUCTION_END_REASONS = ("expired", "buyout", "early_end", "cancelled")


class Category(Base):
    """カテゴリ（階層なし）。初期データはマイグレーションで入れる（ADR-0008）。"""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Listing(Base):
    """出品（商品情報）。オークションの開催情報は Auction に分ける。"""

    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint(f"length(title) BETWEEN 1 AND {TITLE_MAX}", name="title_length"),
        CheckConstraint(
            f"length(description) BETWEEN 1 AND {DESCRIPTION_MAX}", name="description_length"
        ),
        CheckConstraint(f"condition IN {CONDITIONS}", name="condition"),
        CheckConstraint(f"shipping_payer IN {SHIPPING_PAYERS}", name="shipping_payer"),
        CheckConstraint(
            f"length(shipping_method) BETWEEN 1 AND {SHIPPING_METHOD_MAX}", name="shipping_method_length"
        ),
        CheckConstraint(f"status IN {LISTING_STATUSES}", name="status"),
        # 楽観ロック用（auction-bid-transaction.md「ロック方式の使い分け」）
        CheckConstraint("version >= 1", name="version_positive"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    title: Mapped[str] = mapped_column(String(TITLE_MAX))
    description: Mapped[str] = mapped_column(Text)
    condition: Mapped[str] = mapped_column(String(16))
    shipping_payer: Mapped[str] = mapped_column(String(16))
    shipping_method: Mapped[str] = mapped_column(String(SHIPPING_METHOD_MAX))
    status: Mapped[str] = mapped_column(String(16), default="draft", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    seller: Mapped[User] = relationship()
    category: Mapped[Category] = relationship()
    auction: Mapped["Auction | None"] = relationship(back_populates="listing", uselist=False)


class Auction(Base):
    """オークションの開催情報。公開と同時に作成・開始する（ADR-0008）。1出品に1件。"""

    __tablename__ = "auctions"
    __table_args__ = (
        CheckConstraint(f"start_price BETWEEN 1 AND {PRICE_MAX}", name="start_price_range"),
        CheckConstraint(
            f"buyout_price IS NULL OR (buyout_price > start_price AND buyout_price <= {PRICE_MAX})",
            name="buyout_price_range",
        ),
        CheckConstraint("ends_at > starts_at", name="ends_after_starts"),
        CheckConstraint("ends_at >= original_ends_at", name="ends_not_before_original"),
        CheckConstraint(f"status IN {AUCTION_STATUSES}", name="status"),
        CheckConstraint(
            f"end_reason IS NULL OR end_reason IN {AUCTION_END_REASONS}", name="end_reason"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"), unique=True)
    start_price: Mapped[int] = mapped_column(Integer)
    buyout_price: Mapped[int | None] = mapped_column(Integer)
    # ADR-0007: 自動延長。既定値は「あり」。
    auto_extension: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime)
    # 自動延長で更新される終了時刻。延長前の値は original_ends_at に残す。
    ends_at: Mapped[datetime] = mapped_column(UTCDateTime, index=True)
    original_ends_at: Mapped[datetime] = mapped_column(UTCDateTime)
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    end_reason: Mapped[str | None] = mapped_column(String(16))
    ended_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    listing: Mapped[Listing] = relationship(back_populates="auction")
