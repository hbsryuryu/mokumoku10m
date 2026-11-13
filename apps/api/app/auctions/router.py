"""Feature AUC-001: 早期終了と、自分の取引一覧（仕様: docs/api/auctions.md）。"""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session as DbSession

from app.auctions import service
from app.auth.deps import get_current_user
from app.db import get_db
from app.listings.schemas import ListingOut, VersionedAction
from app.listings.service import to_listing_out
from app.models import Order, User
from app.schemas import ApiModel

router = APIRouter(prefix="/api/v1", tags=["auctions"])


@router.post("/listings/{listing_id}/end-early", response_model=ListingOut)
def end_early(
    listing_id: int,
    body: VersionedAction,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """出品者が終了日時より前にオークションを終了する。入札があれば最高額入札者が現在の価格で落札する。"""
    return to_listing_out(service.end_early(db, user, listing_id, body.expected_version))


class OrderSummary(ApiModel):
    id: str
    role: Literal["buyer", "seller"]
    status: str
    amount_yen: int
    listing_id: int
    title: str
    created_at: datetime


@router.get("/me/orders", response_model=list[OrderSummary])
def my_orders(
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """自分が落札した・落札された取引（新しい順）。最小限の項目だけ返す（取引の詳細・操作は ORD で作る）。"""
    orders = db.scalars(
        select(Order)
        .where(or_(Order.buyer_id == user.id, Order.seller_id == user.id))
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(limit)
    )
    return [
        OrderSummary(
            id=str(order.id),
            role="buyer" if order.buyer_id == user.id else "seller",
            status=order.status,
            amount_yen=order.amount,
            listing_id=order.listing_id,
            title=order.title,
            created_at=order.created_at,
        )
        for order in orders
    ]
