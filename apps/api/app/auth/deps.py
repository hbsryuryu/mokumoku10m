"""ログイン中の会員を取り出す FastAPI の依存関数。出品・入札などの API はこれを使う。"""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession

from app.auth.sessions import find_valid_session
from app.config import Settings, get_settings
from app.db import get_db
from app.models import Session, User

NOT_AUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"code": "NOT_AUTHENTICATED", "message": "ログインしてください"},
)


def get_current_session(
    request: Request,
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Session:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise NOT_AUTHENTICATED
    session = find_valid_session(db, token)
    if session is None:
        raise NOT_AUTHENTICATED
    # 利用停止・退会した会員は、ログイン中でも未ログインとして扱う（AUTH-001 T-12）。
    if not session.user.is_active:
        raise NOT_AUTHENTICATED
    return session


def get_current_user(session: Session = Depends(get_current_session)) -> User:
    return session.user
