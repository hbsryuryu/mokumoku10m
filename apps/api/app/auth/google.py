"""AUTH-001: Google authorization-code + PKCE, server-side token validation."""

import hashlib
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta
from urllib.parse import unquote, urlencode, urlsplit

import httpx
from authlib.integrations.httpx_client import OAuth2Client
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse
from joserfc import jwt
from joserfc.jwk import KeySet
from joserfc.jwt import JWTClaimsRegistry
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.auth.sessions import create_session, find_valid_session, set_session_cookie
from app.config import Settings, get_settings
from app.db import get_db, utcnow
from app.errors import ApiError
from app.models import AuthIdentity, OAuthAttempt, User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
WINDOW_SECONDS = 60
_buckets = defaultdict(deque)
_lock = threading.Lock()


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def safe_return_path(value: str) -> str:
    decoded = unquote(value)
    if (
        len(value) > 1500
        or not decoded.startswith("/")
        or decoded.startswith("//")
        or "\\" in decoded
        or any(ord(c) < 32 or ord(c) == 127 for c in decoded)
        or urlsplit(decoded).scheme
        or urlsplit(decoded).netloc
        or decoded.startswith("/api/")
        or decoded.startswith("/login")
    ):
        return "/"
    return value


def cookie_name(settings: Settings) -> str:
    return "oauth_browser" if settings.is_local else "__Host-oauth_browser"


def rate_limit(request: Request):
    # 初期の単一APIプロセス向け。プロキシ由来の任意IPヘッダーは信用しない。
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _lock:
        for old_key in list(_buckets):
            if not _buckets[old_key] or _buckets[old_key][-1] < now - WINDOW_SECONDS:
                del _buckets[old_key]
        bucket = _buckets[key]
        while bucket and bucket[0] < now - WINDOW_SECONDS:
            bucket.popleft()
        if len(bucket) >= 20:
            raise ApiError(
                429, "RATE_LIMITED", "ログイン操作が多すぎます。しばらく待ってください"
            )
        bucket.append(now)


@router.get("/options")
def options(settings: Settings = Depends(get_settings)):
    return JSONResponse(
        {
            "googleEnabled": settings.google_enabled,
            "devLoginEnabled": settings.is_local and settings.dev_login_enabled,
        },
        headers={"Cache-Control": "no-store"},
    )


@router.get("/google/start")
def start(
    request: Request,
    return_to: str = "/",
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if not settings.google_enabled:
        raise ApiError(503, "GOOGLE_NOT_CONFIGURED", "Googleログインの設定が必要です")
    rate_limit(request)
    state, browser, nonce, verifier = (secrets.token_urlsafe(32) for _ in range(4))
    now = utcnow()
    db.execute(delete(OAuthAttempt).where(OAuthAttempt.expires_at <= now))
    db.add(
        OAuthAttempt(
            state_hash=digest(state),
            browser_hash=digest(browser),
            nonce=nonce,
            verifier=verifier,
            return_path=safe_return_path(return_to),
            expires_at=now + timedelta(minutes=10),
        )
    )
    db.commit()
    with OAuth2Client(
        settings.google_client_id,
        scope="openid email profile",
        redirect_uri=settings.google_redirect_uri,
        code_challenge_method="S256",
    ) as client:
        url, _ = client.create_authorization_url(
            AUTHORIZE_URL,
            state=state,
            nonce=nonce,
            code_verifier=verifier,
        )
    response = RedirectResponse(
        url, status_code=302, headers={"Cache-Control": "no-store"}
    )
    response.set_cookie(
        cookie_name(settings),
        browser,
        max_age=600,
        httponly=True,
        secure=not settings.is_local,
        samesite="lax",
        path="/",
    )
    return response


def load_google_keys():
    with httpx.Client(timeout=10, follow_redirects=False) as client:
        response = client.get(JWKS_URL)
        response.raise_for_status()
        return KeySet.import_key_set(response.json())


def exchange_and_verify(code: str, attempt: OAuthAttempt, settings: Settings) -> dict:
    # 外部URLは固定。トークンのjku等や利用者入力から取得先を決めない。
    with OAuth2Client(
        settings.google_client_id,
        settings.google_client_secret,
        redirect_uri=settings.google_redirect_uri,
        token_endpoint_auth_method="client_secret_post",
        timeout=10,
    ) as client:
        token = client.fetch_token(
            TOKEN_URL,
            code=code,
            code_verifier=attempt.verifier,
            grant_type="authorization_code",
        )
    keys = load_google_keys()
    verified = jwt.decode(token["id_token"], keys, algorithms=["RS256"])
    claims = verified.claims
    JWTClaimsRegistry(
        iss={
            "essential": True,
            "values": ["https://accounts.google.com", "accounts.google.com"],
        },
        aud={"essential": True, "value": settings.google_client_id},
        exp={"essential": True},
        iat={"essential": True},
        sub={"essential": True},
        nonce={"essential": True, "value": attempt.nonce},
        email={"essential": True},
    ).validate(claims)
    audience = claims["aud"]
    if (
        claims.get("azp", settings.google_client_id) != settings.google_client_id
        or (isinstance(audience, list) and len(audience) > 1 and not claims.get("azp"))
        or claims.get("email_verified") is not True
        or not isinstance(claims["sub"], str)
        or len(claims["sub"]) > 255
        or not isinstance(claims["email"], str)
        or len(claims["email"]) > 320
    ):
        raise ValueError("Invalid identity claims")
    return claims


def google_member(db: DbSession, claims: dict) -> User:
    def identity():
        return db.scalar(
            select(AuthIdentity).where(
                AuthIdentity.provider == "google",
                AuthIdentity.provider_subject == claims["sub"],
            )
        )

    record = identity()
    if record is None:
        try:
            # 並行した初回ログインでもUserを孤立・重複させない。
            with db.begin_nested():
                user = User(display_name=None)
                db.add(user)
                db.flush()
                record = AuthIdentity(
                    user_id=user.id,
                    provider="google",
                    provider_subject=claims["sub"],
                    email=claims["email"],
                    email_verified=True,
                )
                db.add(record)
                db.flush()
        except IntegrityError:
            record = identity()
            if record is None:
                raise
    if not record.user.is_active:
        raise ApiError(403, "ACCOUNT_SUSPENDED", "この会員は利用できません")
    record.email = claims["email"]
    record.email_verified = True
    record.last_login_at = utcnow()
    return record.user


@router.get("/google/callback")
def callback(
    request: Request,
    state: str = "",
    code: str = "",
    error: str = "",
    db: DbSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if not settings.google_enabled:
        raise ApiError(503, "GOOGLE_NOT_CONFIGURED", "Googleログインの設定が必要です")
    rate_limit(request)
    failure = "failed"
    attempt = None
    try:
        browser = request.cookies.get(cookie_name(settings), "")
        if not state or len(state) > 128 or not browser or len(browser) > 128:
            raise ValueError("Invalid state")
        attempt = db.get(OAuthAttempt, digest(state))
        if not attempt or not secrets.compare_digest(
            attempt.browser_hash, digest(browser)
        ):
            raise ValueError("Invalid browser")
        # DELETEの件数で一回限りの利用を保証。ネットワーク通信前に消費をコミットする。
        consumed = db.execute(
            delete(OAuthAttempt)
            .where(
                OAuthAttempt.state_hash == digest(state),
                OAuthAttempt.expires_at > utcnow(),
            )
            .execution_options(synchronize_session=False)
        )
        db.commit()
        if consumed.rowcount != 1:
            raise ValueError("Expired or consumed")
        if error or not code or len(code) > 4096:
            failure = "cancelled" if error == "access_denied" else "failed"
            raise ValueError("Provider rejected")
        claims = exchange_and_verify(code, attempt, settings)
        user = google_member(db, claims)
        old_token = request.cookies.get(settings.session_cookie_name)
        old_session = find_valid_session(db, old_token) if old_token else None
        if old_session:
            old_session.revoked_at = utcnow()
        token = create_session(db, user, settings)
        destination = (
            "/login?" + urlencode({"setup": "1", "next": attempt.return_path})
            if user.display_name is None
            else attempt.return_path
        )
        db.commit()
        response = RedirectResponse(
            settings.web_origin.rstrip("/") + destination, status_code=302
        )
        set_session_cookie(response, token, settings)
    except Exception as exc:
        # 認可コード、トークン、Googleの例外本文はログ・画面へ出さない。
        db.rollback()
        if isinstance(exc, ApiError) and exc.code == "ACCOUNT_SUSPENDED":
            failure = "suspended"
        response = RedirectResponse(
            settings.web_origin.rstrip("/")
            + "/login?"
            + urlencode({"authError": failure}),
            status_code=302,
        )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.delete_cookie(
        cookie_name(settings),
        path="/",
        httponly=True,
        secure=not settings.is_local,
        samesite="lax",
    )
    return response
