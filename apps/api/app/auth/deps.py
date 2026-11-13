"""ログイン中の会員を取り出す FastAPI の依存関数。出品・入札などの API はこれを使う。"""

from fastapi import Depends, Request
from sqlalchemy.orm import Session as DbSession

from app.auth.sessions import find_valid_session
from app.config import Settings, get_settings
from app.db import get_db
from app.errors import ApiError, not_authenticated
from app.models import Session, User


def get_current_session(
    request: Request,
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Session:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise not_authenticated()
    session = find_valid_session(db, token)
    if session is None:
        raise not_authenticated()
    # 利用停止・退会した会員は、ログイン中でも未ログインとして扱う（AUTH-001 T-12）。
    if not session.user.is_active:
        raise not_authenticated()
    return session


def get_current_user(session: Session = Depends(get_current_session)) -> User:
    return session.user


def get_optional_user(
    request: Request,
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User | None:
    """ログインしていれば会員を、していなければ None を返す（ゲストも使える API 用）。"""
    try:
        return get_current_session(request, db, settings).user
    except ApiError:
        return None
