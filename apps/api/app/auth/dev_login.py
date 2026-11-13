"""Feature AUTH-002: 開発用ログイン（ADR-0008）。

Google ログイン（AUTH-001）を実装するまで、手元で出品・入札を試すための入口。
APP_ENV=local かつ DEV_LOGIN_ENABLED=true のときだけ、main.py がこのルーターを登録する。
それ以外の環境では URL 自体が存在しない（404）。
"""

from fastapi import APIRouter, Depends, Response, status
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth.router import MeResponse, to_me
from app.auth.sessions import create_session, set_session_cookie
from app.config import Settings, get_settings
from app.db import get_db, utcnow
from app.errors import ApiError
from app.models import AuthIdentity, User
from app.schemas import ApiModel

router = APIRouter(prefix="/api/v1/dev", tags=["dev (local only)"])


class DevLoginRequest(ApiModel):
    display_name: str = Field(min_length=1, max_length=30, examples=["seller1"])


@router.post("/login", response_model=MeResponse)
def dev_login(
    body: DevLoginRequest,
    response: Response,
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MeResponse:
    """表示名を指定して開発用の会員でログインする。同じ表示名なら同じ会員になる。"""
    display_name = body.display_name.strip()
    identity = db.scalar(
        select(AuthIdentity).where(
            AuthIdentity.provider == "dev", AuthIdentity.provider_subject == display_name
        )
    )
    if identity is None:
        user = User(display_name=display_name)
        db.add(user)
        db.flush()
        identity = AuthIdentity(
            user_id=user.id, provider="dev", provider_subject=display_name, email_verified=True
        )
        db.add(identity)
    else:
        user = identity.user

    if not user.is_active:
        # Google ログインと同じく、利用停止中の会員にはセッションを発行しない。
        raise ApiError(status.HTTP_403_FORBIDDEN, "ACCOUNT_SUSPENDED", "この会員は利用停止中です")

    identity.last_login_at = utcnow()
    token = create_session(db, user, settings)
    db.commit()
    set_session_cookie(response, token, settings)
    return to_me(user)
