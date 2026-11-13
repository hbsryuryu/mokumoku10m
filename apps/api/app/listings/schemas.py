"""Feature LST-004: 出品 API の入出力（JSON は camelCase、金額は `...Yen`）。

入力の上限は ADR-0008 の仮の値（models/listing.py の定数）に合わせる。
"""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field, StringConstraints, model_validator

from app.models.listing import (
    DESCRIPTION_MAX,
    DURATION_MAX_HOURS,
    DURATION_MIN_HOURS,
    PRICE_MAX,
    SHIPPING_METHOD_MAX,
    TITLE_MAX,
)
from app.schemas import ApiModel

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=TITLE_MAX)]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=DESCRIPTION_MAX)
]
ShippingMethod = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=SHIPPING_METHOD_MAX)
]
Price = Annotated[int, Field(ge=1, le=PRICE_MAX)]
DurationHours = Annotated[int, Field(ge=DURATION_MIN_HOURS, le=DURATION_MAX_HOURS)]
Condition = Literal["new", "like_new", "some_wear", "worn"]
ShippingPayer = Literal["seller", "buyer"]
ExpectedVersion = Annotated[int, Field(ge=1, description="取得したときの version（楽観ロック）")]


def _check_buyout(start: int | None, buyout: int | None) -> None:
    if start is not None and buyout is not None and buyout <= start:
        raise ValueError("即決価格は開始価格より高くしてください")


# --- 入力 ---------------------------------------------------------------------


class ListingCreate(ApiModel):
    title: Title
    description: Description
    category_id: int
    condition: Condition
    shipping_payer: ShippingPayer
    shipping_method: ShippingMethod
    start_price_yen: Price
    buyout_price_yen: Price | None = None
    auto_extension: bool = True  # ADR-0007: 既定値は「あり」
    duration_hours: DurationHours = Field(examples=[72])

    @model_validator(mode="after")
    def buyout_must_exceed_start(self):
        _check_buyout(self.start_price_yen, self.buyout_price_yen)
        return self


class ListingUpdate(ApiModel):
    """下書きの編集。送った項目だけを変える。`buyoutPriceYen: null` で即決価格を外せる。"""

    expected_version: ExpectedVersion
    title: Title | None = None
    description: Description | None = None
    category_id: int | None = None
    condition: Condition | None = None
    shipping_payer: ShippingPayer | None = None
    shipping_method: ShippingMethod | None = None
    start_price_yen: Price | None = None
    buyout_price_yen: Price | None = None
    auto_extension: bool | None = None
    duration_hours: DurationHours | None = None


class VersionedAction(ApiModel):
    """公開・取り下げなど、出品の状態を変える操作。古い画面からの操作を防ぐため version を送る。"""

    expected_version: ExpectedVersion


# --- 出力 ---------------------------------------------------------------------


class CategoryOut(ApiModel):
    id: int
    name: str


class SellerOut(ApiModel):
    id: int
    display_name: str | None


class AuctionOut(ApiModel):
    status: str
    starts_at: datetime
    ends_at: datetime
    start_price_yen: int
    buyout_price_yen: int | None
    auto_extension: bool
    current_price_yen: int
    minimum_bid_yen: int
    bid_count: int
    end_reason: str | None
    ended_at: datetime | None


class ListingOut(ApiModel):
    id: int
    status: str
    version: int
    title: str
    description: str
    category: CategoryOut
    condition: str
    condition_label: str
    shipping_payer: str
    shipping_method: str
    # 出品条件（下書きで編集する値。公開後は auction の値が正）
    start_price_yen: int
    buyout_price_yen: int | None
    auto_extension: bool
    duration_hours: int
    seller: SellerOut
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    auction: AuctionOut | None


class ListingSummary(ApiModel):
    """一覧用の要約。"""

    id: int
    status: str
    title: str
    category: CategoryOut
    condition: str
    condition_label: str
    seller: SellerOut
    current_price_yen: int
    buyout_price_yen: int | None
    bid_count: int
    ends_at: datetime | None
    published_at: datetime | None


class ListingPage(ApiModel):
    items: list[ListingSummary]
    limit: int
    offset: int
    has_more: bool
