"""ログイン中の会員の情報とログアウト（AUTH-001 / AUTH-002 共通）。"""

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import get_current_session, get_current_user
from app.auth.sessions import clear_session_cookie
from app.config import Settings, get_settings
from app.db import get_db, utcnow
from app.models import Session, User

router = APIRouter(prefix="/api/v1", tags=["auth"])


class MeResponse(BaseModel):
    id: int
    display_name: str | None
    role: str


def to_me(user: User) -> MeResponse:
    return MeResponse(id=user.id, display_name=user.display_name, role=user.role)


@router.get("/me", response_model=MeResponse)
def read_me(user: User = Depends(get_current_user)) -> MeResponse:
    """ログイン中の会員の情報を返す。未ログインなら 401。"""
    return to_me(user)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session: Session = Depends(get_current_session),
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    """サーバー側のセッションを無効化し、Cookie を消す。"""
    # TODO(AUTH-001): Google ログインの実装時に、Origin ヘッダーの確認による CSRF 対策（設計 T-14）を追加する。
    # 現在は Cookie の SameSite=Lax で、別サイトからの POST に Cookie が送られないことに頼っている。
    session.revoked_at = utcnow()
    db.commit()
    response.status_code = status.HTTP_204_NO_CONTENT
    clear_session_cookie(response, settings)
    return response
