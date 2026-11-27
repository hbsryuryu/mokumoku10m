"""ログイン中の会員の情報とログアウト（AUTH-001 / AUTH-002 共通）。"""

from fastapi import APIRouter, Depends, Response, status
from pydantic import Field, field_validator
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import get_current_session, get_current_user
from app.auth.sessions import clear_session_cookie
from app.config import Settings, get_settings
from app.db import get_db, utcnow
from app.models import Session, User
from app.schemas import ApiModel

router = APIRouter(prefix="/api/v1", tags=["auth"])


class MeResponse(ApiModel):
    id: int
    display_name: str | None
    role: str


def to_me(user: User) -> MeResponse:
    return MeResponse(id=user.id, display_name=user.display_name, role=user.role)


@router.get("/me", response_model=MeResponse)
def read_me(user: User = Depends(get_current_user)) -> MeResponse:
    """ログイン中の会員の情報を返す。未ログインなら 401。"""
    return to_me(user)


class NicknameRequest(ApiModel):
    display_name: str = Field(min_length=1, max_length=30)

    @field_validator("display_name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value


@router.patch("/me", response_model=MeResponse)
def update_me(body: NicknameRequest, user: User = Depends(get_current_user),
              db: DbSession = Depends(get_db)):
    user.display_name = body.display_name
    db.commit()
    return to_me(user)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session: Session = Depends(get_current_session),
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    """サーバー側のセッションを無効化し、Cookie を消す。"""
    # Originチェックはmain.py、CookieはSameSite=Laxで保護する。
    session.revoked_at = utcnow()
    db.commit()
    response.status_code = status.HTTP_204_NO_CONTENT
    clear_session_cookie(response, settings)
    return response
