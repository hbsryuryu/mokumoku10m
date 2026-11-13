"""Feature LST-004: 出品の業務ルール。

- 下書きの編集・公開は Listing の楽観ロック（`version`）で、古い画面からの上書きを防ぐ。
- 取り下げはオークションの悲観ロック（app.locking）を取ってから状態を確認する（入札との競合対策）。
- 公開後の編集（ADR-0004: 入札がなければ編集できる）は、入札（BID-001）の実装後に追加する。
"""

from datetime import timedelta

from fastapi import status
from sqlalchemy import Select, or_, select, update
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import joinedload

from app.db import utcnow
from app.bids.pricing import bid_increment
from app.errors import ApiError, listing_not_found
from app.listings.schemas import (
    AuctionOut,
    CategoryOut,
    ListingCreate,
    ListingOut,
    ListingSummary,
    ListingUpdate,
    SellerOut,
)
from app.locking import lock_auction
from app.models import Auction, Category, Listing, User
from app.models.listing import CONDITION_LABELS

# 入力の項目名（API）と列名（DB）の対応。金額だけ名前が違う。
FIELD_TO_COLUMN = {"start_price_yen": "start_price", "buyout_price_yen": "buyout_price"}

# 公開中の出品を、出品者以外にも見せる状態
PUBLIC_STATUSES = ("published", "ended")


# --- エラー -------------------------------------------------------------------


def version_conflict(current_version: int) -> ApiError:
    return ApiError(
        status.HTTP_409_CONFLICT,
        "VERSION_CONFLICT",
        "ほかの画面で出品が更新されています。最新の内容を読み込み直してください",
        {"currentVersion": current_version},
    )


def not_editable(listing_status: str) -> ApiError:
    return ApiError(
        status.HTTP_409_CONFLICT,
        "LISTING_NOT_EDITABLE",
        "この状態の出品は、この操作ができません",
        {"status": listing_status},
    )


def validation_error(field: str, message: str) -> ApiError:
    return ApiError(
        422,
        "VALIDATION_ERROR",
        "入力内容を確認してください",
        {"fields": [{"field": field, "message": message}]},
    )


def require_nickname(user: User) -> None:
    # AUTH-001 FR-5: 公開する表示名（ニックネーム）を決めるまでは出品できない。
    if not user.display_name:
        raise ApiError(
            status.HTTP_403_FORBIDDEN, "NICKNAME_REQUIRED", "出品する前にニックネームを設定してください"
        )


def ensure_category_exists(db: DbSession, category_id: int) -> None:
    if db.get(Category, category_id) is None:
        raise validation_error("categoryId", "存在しないカテゴリです")


# --- 出力の組み立て ----------------------------------------------------------


def price_summary(auction: Auction) -> dict[str, int]:
    """現在の価格・最低入札額・入札数（オークションの集計列から。計算は BID-001 の app/bids/pricing.py）。"""
    if auction.bid_count == 0:
        minimum = auction.start_price
    else:
        minimum = auction.current_price + bid_increment(auction.current_price)
    return {
        "current_price_yen": auction.current_price,
        "minimum_bid_yen": minimum,
        "bid_count": auction.bid_count,
    }


def to_auction_out(auction: Auction) -> AuctionOut:
    return AuctionOut(
        status=auction.status,
        starts_at=auction.starts_at,
        ends_at=auction.ends_at,
        start_price_yen=auction.start_price,
        buyout_price_yen=auction.buyout_price,
        auto_extension=auction.auto_extension,
        end_reason=auction.end_reason,
        ended_at=auction.ended_at,
        **price_summary(auction),
    )


def to_listing_out(listing: Listing) -> ListingOut:
    return ListingOut(
        id=listing.id,
        status=listing.status,
        version=listing.version,
        title=listing.title,
        description=listing.description,
        category=CategoryOut.model_validate(listing.category),
        condition=listing.condition,
        condition_label=CONDITION_LABELS[listing.condition],
        shipping_payer=listing.shipping_payer,
        shipping_method=listing.shipping_method,
        start_price_yen=listing.start_price,
        buyout_price_yen=listing.buyout_price,
        auto_extension=listing.auto_extension,
        duration_hours=listing.duration_hours,
        seller=SellerOut.model_validate(listing.seller),
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        published_at=listing.published_at,
        auction=to_auction_out(listing.auction) if listing.auction else None,
    )


def to_summary(listing: Listing) -> ListingSummary:
    auction = listing.auction
    prices = price_summary(auction) if auction else {"current_price_yen": listing.start_price, "bid_count": 0}
    return ListingSummary(
        id=listing.id,
        status=listing.status,
        title=listing.title,
        category=CategoryOut.model_validate(listing.category),
        condition=listing.condition,
        condition_label=CONDITION_LABELS[listing.condition],
        seller=SellerOut.model_validate(listing.seller),
        current_price_yen=prices["current_price_yen"],
        buyout_price_yen=auction.buyout_price if auction else listing.buyout_price,
        bid_count=prices["bid_count"],
        ends_at=auction.ends_at if auction else None,
        published_at=listing.published_at,
    )


# --- 読み込み -----------------------------------------------------------------


def _with_relations(statement: Select) -> Select:
    return statement.options(
        joinedload(Listing.category), joinedload(Listing.seller), joinedload(Listing.auction)
    )


def load_listing(db: DbSession, listing_id: int) -> Listing | None:
    return db.scalar(
        _with_relations(select(Listing).where(Listing.id == listing_id)).execution_options(
            populate_existing=True
        )
    )


def get_visible_listing(db: DbSession, listing_id: int, viewer: User | None) -> Listing:
    """見てよい出品を返す。下書き・取り下げ・運営停止は出品者本人だけが見られる。"""
    listing = load_listing(db, listing_id)
    if listing is None:
        raise listing_not_found()
    is_owner = viewer is not None and viewer.id == listing.seller_id
    if listing.status not in PUBLIC_STATUSES and not is_owner:
        # 存在を知られないよう、権限がない場合も 404 にする（IDOR 対策）。
        raise listing_not_found()
    return listing


def get_own_listing(db: DbSession, listing_id: int, seller: User) -> Listing:
    listing = load_listing(db, listing_id)
    if listing is None or listing.seller_id != seller.id:
        raise listing_not_found()
    return listing


def escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_public_listings(
    db: DbSession,
    *,
    q: str | None,
    category_id: int | None,
    sort: str,
    limit: int,
    offset: int,
) -> tuple[list[Listing], bool]:
    """公開中・開催中の出品を探す。検索は当面 LIKE（ADR-0006）。"""
    statement = (
        _with_relations(select(Listing))
        .join(Auction, Auction.listing_id == Listing.id)
        .where(Listing.status == "published", Auction.status == "active", Auction.ends_at > utcnow())
    )
    if category_id is not None:
        statement = statement.where(Listing.category_id == category_id)
    if q:
        pattern = f"%{escape_like(q.strip())}%"
        statement = statement.where(
            or_(Listing.title.like(pattern, escape="\\"), Listing.description.like(pattern, escape="\\"))
        )
    if sort == "newest":
        statement = statement.order_by(Listing.published_at.desc(), Listing.id.desc())
    elif sort == "price_asc":
        statement = statement.order_by(Auction.current_price.asc(), Listing.id.asc())
    elif sort == "price_desc":
        statement = statement.order_by(Auction.current_price.desc(), Listing.id.asc())
    elif sort == "bids":
        statement = statement.order_by(Auction.bid_count.desc(), Auction.ends_at.asc(), Listing.id.asc())
    else:  # ending: 終了が近い順
        statement = statement.order_by(Auction.ends_at.asc(), Listing.id.asc())
    # 1件多く取って、次のページがあるかを判定する。
    rows = list(db.scalars(statement.limit(limit + 1).offset(offset)).unique())
    return rows[:limit], len(rows) > limit


def list_own_listings(
    db: DbSession, seller: User, *, status_filter: str | None, limit: int, offset: int
) -> tuple[list[Listing], bool]:
    statement = _with_relations(select(Listing)).where(Listing.seller_id == seller.id)
    if status_filter:
        statement = statement.where(Listing.status == status_filter)
    statement = statement.order_by(Listing.updated_at.desc(), Listing.id.desc())
    rows = list(db.scalars(statement.limit(limit + 1).offset(offset)).unique())
    return rows[:limit], len(rows) > limit


def list_categories(db: DbSession) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.sort_order, Category.id)))


# --- 書き込み -----------------------------------------------------------------


def create_listing(db: DbSession, seller: User, data: ListingCreate) -> Listing:
    require_nickname(seller)
    ensure_category_exists(db, data.category_id)
    listing = Listing(
        seller_id=seller.id,
        category_id=data.category_id,
        title=data.title,
        description=data.description,
        condition=data.condition,
        shipping_payer=data.shipping_payer,
        shipping_method=data.shipping_method,
        start_price=data.start_price_yen,
        buyout_price=data.buyout_price_yen,
        auto_extension=data.auto_extension,
        duration_hours=data.duration_hours,
    )
    db.add(listing)
    db.commit()
    return load_listing(db, listing.id)


def _apply_versioned_update(
    db: DbSession, listing: Listing, expected_version: int, required_status: str, values: dict
) -> None:
    """version と状態が一致するときだけ更新する（楽観ロック）。一致しなければ理由に合ったエラー。"""
    result = db.execute(
        update(Listing)
        .where(
            Listing.id == listing.id,
            Listing.seller_id == listing.seller_id,
            Listing.status == required_status,
            Listing.version == expected_version,
        )
        .values(**values, version=Listing.version + 1, updated_at=utcnow())
    )
    if result.rowcount == 1:
        return
    db.rollback()
    current = load_listing(db, listing.id)
    if current.status != required_status:
        raise not_editable(current.status)
    raise version_conflict(current.version)


def update_draft(db: DbSession, seller: User, listing_id: int, data: ListingUpdate) -> Listing:
    listing = get_own_listing(db, listing_id, seller)
    if listing.status != "draft":
        # TODO(LST-004): 公開後・入札なしの編集（ADR-0004）は、入札（BID-001）の実装後に対応する。
        raise not_editable(listing.status)

    changes = data.model_dump(exclude_unset=True, exclude={"expected_version"})
    if "category_id" in changes:
        if changes["category_id"] is None:
            raise validation_error("categoryId", "カテゴリは必須です")
        ensure_category_exists(db, changes["category_id"])
    for required in ("title", "description", "condition", "shipping_payer", "shipping_method",
                     "start_price_yen", "auto_extension", "duration_hours"):
        if required in changes and changes[required] is None:
            raise validation_error(required, "この項目は空にできません")

    values = {FIELD_TO_COLUMN.get(key, key): value for key, value in changes.items()}
    start = values.get("start_price", listing.start_price)
    buyout = values.get("buyout_price", listing.buyout_price)
    if buyout is not None and buyout <= start:
        raise validation_error("buyoutPriceYen", "即決価格は開始価格より高くしてください")

    _apply_versioned_update(db, listing, data.expected_version, "draft", values)
    db.commit()
    return load_listing(db, listing_id)


def publish_listing(db: DbSession, seller: User, listing_id: int, expected_version: int) -> Listing:
    """下書きを公開し、同時にオークションを開始する（ADR-0008: 公開と同時に開始）。"""
    require_nickname(seller)
    listing = get_own_listing(db, listing_id, seller)
    if listing.status != "draft":
        raise not_editable(listing.status)
    # TODO(LST-003): 画像を追加したら、公開時の必須チェックに入れる（ADR-0008 では対象外）。
    # TODO(MOD): 禁止商品の確認（仕様書 5.2）は、基準が決まったら追加する。

    now = utcnow()
    _apply_versioned_update(
        db, listing, expected_version, "draft", {"status": "published", "published_at": now}
    )
    ends_at = now + timedelta(hours=listing.duration_hours)
    db.add(
        Auction(
            listing_id=listing.id,
            start_price=listing.start_price,
            buyout_price=listing.buyout_price,
            auto_extension=listing.auto_extension,
            starts_at=now,
            ends_at=ends_at,
            original_ends_at=ends_at,
            status="active",
            current_price=listing.start_price,
            bid_count=0,
        )
    )
    db.commit()
    return load_listing(db, listing_id)


def withdraw_listing(db: DbSession, seller: User, listing_id: int, expected_version: int) -> Listing:
    """公開中の出品を取り下げる（ADR-0004: 入札がない場合だけ）。"""
    listing = get_own_listing(db, listing_id, seller)
    if listing.status != "published" or listing.auction is None:
        raise not_editable(listing.status)

    # 入札と同時に取り下げられないよう、オークションのロックを取ってから状態を確認し直す。
    auction = lock_auction(db, listing.auction.id)
    listing = load_listing(db, listing_id)
    if listing.status != "published" or auction.status != "active":
        db.rollback()
        raise not_editable(listing.status)
    if listing.version != expected_version:
        db.rollback()
        raise version_conflict(listing.version)
    if auction.bid_count > 0:
        db.rollback()
        raise ApiError(
            status.HTTP_409_CONFLICT, "HAS_BIDS", "入札がある出品は取り下げできません（早期終了は可能）"
        )

    now = utcnow()
    listing.status = "cancelled"
    listing.version += 1
    listing.updated_at = now
    auction.status = "cancelled"
    auction.end_reason = "cancelled"
    auction.ended_at = now
    db.commit()
    return load_listing(db, listing_id)


def delete_draft(db: DbSession, seller: User, listing_id: int) -> None:
    """下書きを破棄する（ADR-0004）。公開済みの出品は消さない（取り下げを使う）。"""
    listing = get_own_listing(db, listing_id, seller)
    if listing.status != "draft":
        raise not_editable(listing.status)
    db.delete(listing)
    db.commit()
