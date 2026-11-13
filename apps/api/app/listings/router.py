"""Feature LST-004: 出品 API（仕様: docs/api/listings.md）。"""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import get_current_user, get_optional_user
from app.db import get_db
from app.listings import service
from app.listings.schemas import (
    CategoryOut,
    ListingCreate,
    ListingOut,
    ListingPage,
    ListingUpdate,
    VersionedAction,
)
from app.models import User

router = APIRouter(prefix="/api/v1", tags=["listings"])

Limit = Query(20, ge=1, le=50, description="1ページの件数（最大50）")
Offset = Query(0, ge=0, le=10_000)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DbSession = Depends(get_db)):
    """カテゴリの一覧（出品フォームと絞り込み用）。"""
    return service.list_categories(db)


@router.get("/listings", response_model=ListingPage)
def search_listings(
    q: str | None = Query(None, max_length=100, description="キーワード（タイトル・説明の部分一致）"),
    category_id: int | None = Query(None, alias="categoryId"),
    sort: Literal["ending", "newest", "price_asc", "price_desc", "bids"] = Query(
        "ending",
        description="ending=終了が近い順、newest=新着順、price_asc/price_desc=現在の価格の安い順/高い順、bids=入札数の多い順",
    ),
    limit: int = Limit,
    offset: int = Offset,
    db: DbSession = Depends(get_db),
):
    """公開中・開催中の出品を探す（ログイン不要）。"""
    items, has_more = service.search_public_listings(
        db, q=q, category_id=category_id, sort=sort, limit=limit, offset=offset
    )
    return ListingPage(
        items=[service.to_summary(item) for item in items], limit=limit, offset=offset, has_more=has_more
    )


@router.get("/me/listings", response_model=ListingPage)
def my_listings(
    status_filter: Literal["draft", "published", "ended", "suspended", "cancelled"] | None = Query(
        None, alias="status"
    ),
    limit: int = Limit,
    offset: int = Offset,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """自分の出品（下書き・取り下げを含む）。"""
    items, has_more = service.list_own_listings(
        db, user, status_filter=status_filter, limit=limit, offset=offset
    )
    return ListingPage(
        items=[service.to_summary(item) for item in items], limit=limit, offset=offset, has_more=has_more
    )


@router.post("/listings", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(
    body: ListingCreate, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)
):
    """下書きを作る。公開するまでは出品者本人にしか見えない。"""
    return service.to_listing_out(service.create_listing(db, user, body))


@router.get("/listings/{listing_id}", response_model=ListingOut)
def get_listing(
    listing_id: int, viewer: User | None = Depends(get_optional_user), db: DbSession = Depends(get_db)
):
    """出品の詳細。下書き・取り下げ・運営停止は出品者本人だけが見られる（それ以外は 404）。"""
    return service.to_listing_out(service.get_visible_listing(db, listing_id, viewer))


@router.patch("/listings/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: int,
    body: ListingUpdate,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """下書きを編集する。`expectedVersion` が最新と違えば 409 VERSION_CONFLICT。"""
    return service.to_listing_out(service.update_draft(db, user, listing_id, body))


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)
):
    """下書きを破棄する。公開済みの出品は取り下げ（withdraw）を使う。"""
    service.delete_draft(db, user, listing_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/listings/{listing_id}/publish", response_model=ListingOut)
def publish_listing(
    listing_id: int,
    body: VersionedAction,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """下書きを公開し、オークションを開始する。終了日時は公開時刻＋開催期間。"""
    return service.to_listing_out(service.publish_listing(db, user, listing_id, body.expected_version))


@router.post("/listings/{listing_id}/withdraw", response_model=ListingOut)
def withdraw_listing(
    listing_id: int,
    body: VersionedAction,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """公開中の出品を取り下げる（入札がない場合だけ。ADR-0004）。"""
    return service.to_listing_out(service.withdraw_listing(db, user, listing_id, body.expected_version))
