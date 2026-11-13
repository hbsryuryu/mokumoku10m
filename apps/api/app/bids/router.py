"""Feature BID-001: 入札 API（仕様: docs/api/openapi.md「入札成功レスポンス」、docs/api/bids.md）。"""

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import Field, StrictInt
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import get_current_user
from app.bids import service
from app.db import get_db
from app.models import User
from app.schemas import ApiModel

router = APIRouter(prefix="/api/v1", tags=["bids"])


class BidRequestBody(ApiModel):
    # StrictInt: "100" や 1.0 や true を整数に変換せずに拒否する（テスト仕様 BID-04）。
    # 上限超過は BID_LIMIT_EXCEEDED として業務ルールで返すため、ここでは下限だけ確認する。
    amount_yen: StrictInt = Field(ge=1, description="最高入札額（円）。自動入札でこの金額まで競る")


@router.post("/listings/{listing_id}/bids", status_code=201)
def place_bid(
    listing_id: int,
    body: BidRequestBody,
    idempotency_key: str | None = Header(
        None, alias="Idempotency-Key", description="再送で二重に入札しないためのキー（1〜64文字）"
    ),
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """入札する（最高入札額を指定）。即決価格以上なら即決で落札する。

    同じ `Idempotency-Key`・同じ本文の再送には、初回と同じ HTTP ステータスと本文を返す。
    """
    key = service.validate_idempotency_key(idempotency_key)
    outcome = service.place_bid(db, user, listing_id, body.amount_yen, key)
    # 本人だけに返す内容（最高入札額など）なので、キャッシュさせない。
    return JSONResponse(
        status_code=outcome.status_code, content=outcome.body, headers={"Cache-Control": "no-store"}
    )
