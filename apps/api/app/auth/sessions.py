"""アプリのログインセッション（AUTH-001 / AUTH-002 で共通）。

- セッション ID は 256 ビットの乱数。DB には SHA-256 のハッシュ値だけを保存する。
- Google ログインでも開発用ログインでも、ここで同じセッションを発行する（ADR-0008）。
"""

import hashlib
import secrets
from datetime import timedelta

from fastapi import Response
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.config import Settings
from app.db import utcnow
from app.models import Session, User


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def create_session(db: DbSession, user: User, settings: Settings) -> str:
    """セッションを作成し、Cookie に入れる生のトークンを返す。"""
    token = secrets.token_urlsafe(32)
    now = utcnow()
    db.add(
        Session(
            user_id=user.id,
            token_hash=hash_token(token),
            created_at=now,
            expires_at=now + timedelta(hours=settings.session_ttl_hours),
        )
    )
    return token


def find_valid_session(db: DbSession, token: str) -> Session | None:
    """有効期限内で、無効化されていないセッションを探す。"""
    session = db.scalar(select(Session).where(Session.token_hash == hash_token(token)))
    if session is None or session.revoked_at is not None or session.expires_at <= utcnow():
        return None
    return session


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_hours * 3600,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )
