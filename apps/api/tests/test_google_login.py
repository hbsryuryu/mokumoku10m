import base64
import hashlib
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient
from joserfc import jwt
from joserfc.jwk import KeySet, RSAKey
from sqlalchemy import func, select

from app.auth import google
from app.config import Settings
from app.db import utcnow
from app.main import configure_logging, create_app
from app.models import AuthIdentity, OAuthAttempt, Session, User


@pytest.fixture
def google_client():
    google._buckets.clear()
    settings = Settings(
        app_env="local",
        dev_login_enabled=False,
        google_client_id="test-client",
        google_client_secret="test-secret",
        google_redirect_uri="http://localhost:8000/api/v1/auth/google/callback",
        web_origin="http://localhost:3000",
        finalizer_interval_seconds=0,
    )
    return TestClient(create_app(settings), follow_redirects=False)


@pytest.fixture
def signer(monkeypatch):
    key = RSAKey.generate_key(2048, parameters={"kid": "test-key"})
    monkeypatch.setattr(
        google,
        "load_google_keys",
        lambda: KeySet.import_key_set(
            {"keys": [key.as_dict(private=False)]},
        ),
    )

    def configure(expected_nonce, **overrides):
        claims = {
            "iss": "https://accounts.google.com",
            "aud": "test-client",
            "sub": "google-person-1",
            "email": "member@example.test",
            "email_verified": True,
            "nonce": expected_nonce,
            "iat": int(time.time()),
            "exp": int(time.time()) + 600,
        }
        claims.update(overrides)
        token = jwt.encode({"alg": "RS256", "kid": "test-key"}, claims, key)
        monkeypatch.setattr(
            google.OAuth2Client, "fetch_token", lambda *_a, **_k: {"id_token": token}
        )
        return token

    return configure


def begin(client, return_to="/me"):
    response = client.get("/api/v1/auth/google/start", params={"return_to": return_to})
    assert response.status_code == 302
    query = parse_qs(urlsplit(response.headers["location"]).query)
    assert query["scope"] == ["openid email profile"]
    assert query["code_challenge_method"] == ["S256"]
    assert "code_verifier" not in query
    return query["state"][0], query["nonce"][0]


def finish(client, state):
    return client.get(
        "/api/v1/auth/google/callback", params={"state": state, "code": "test-code"}
    )


def test_google_signup_nickname_and_relogin(google_client, signer, db):
    state, nonce = begin(google_client)
    signer(nonce, name="Private real name", picture="https://example.test/private.jpg")
    response = finish(google_client, state)
    assert response.status_code == 302
    assert response.headers["location"].startswith(
        "http://localhost:3000/login?setup=1"
    )
    me = google_client.get("/api/v1/me").json()
    assert me["displayName"] is None
    assert (
        google_client.patch("/api/v1/me", json={"displayName": "   "}).status_code
        == 422
    )
    assert (
        google_client.patch(
            "/api/v1/me", json={"displayName": "  ニックネーム  "}
        ).json()["displayName"]
        == "ニックネーム"
    )
    old_cookie = google_client.cookies.get("session")
    state, nonce = begin(google_client)
    signer(nonce, email="changed@example.test")
    response = finish(google_client, state)
    assert response.headers["location"] == "http://localhost:3000/me"
    assert google_client.cookies.get("session") != old_cookie
    assert db.scalar(select(func.count()).select_from(User)) == 1
    assert db.scalar(select(AuthIdentity)).email == "changed@example.test"
    old = TestClient(google_client.app)
    old.cookies.set("session", old_cookie)
    assert old.get("/api/v1/me").status_code == 401


@pytest.mark.parametrize(
    "claims",
    [
        {"iss": "https://evil.example"},
        {"aud": "other-client"},
        {"exp": 1},
        {"nonce": "wrong"},
        {"email_verified": False},
        {"email_verified": "true"},
        {"azp": "other-client"},
        {"aud": ["test-client", "other"]},
    ],
)
def test_invalid_claims_do_not_create_member(google_client, signer, db, claims):
    state, nonce = begin(google_client)
    signer(nonce, **claims)
    assert "authError=failed" in finish(google_client, state).headers["location"]
    assert google_client.get("/api/v1/me").status_code == 401
    assert db.scalar(select(func.count()).select_from(User)) == 0


def test_invalid_signature(google_client, signer, monkeypatch, db):
    state, nonce = begin(google_client)
    signer(nonce)
    other_key = RSAKey.generate_key(2048, parameters={"kid": "test-key"})
    monkeypatch.setattr(
        google,
        "load_google_keys",
        lambda: KeySet.import_key_set(
            {"keys": [other_key.as_dict(private=False)]},
        ),
    )
    assert "authError=failed" in finish(google_client, state).headers["location"]
    assert db.scalar(select(func.count()).select_from(Session)) == 0


def test_state_browser_expiry_and_replay(google_client, signer, db):
    state, nonce = begin(google_client)
    signer(nonce)
    other = TestClient(google_client.app, follow_redirects=False)
    assert "authError=failed" in finish(other, state).headers["location"]
    assert (
        "authError=failed" in finish(google_client, "wrong-state").headers["location"]
    )
    # 不正stateの応答はCookieを消すため、新しい要求からやり直す。
    state, nonce = begin(google_client)
    signer(nonce)
    browser = google_client.cookies.get("oauth_browser")
    finish(google_client, state)
    google_client.cookies.set("oauth_browser", browser)
    assert "authError=failed" in finish(google_client, state).headers["location"]
    state, nonce = begin(google_client)
    attempt = db.get(OAuthAttempt, google.digest(state))
    attempt.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()
    assert "authError=failed" in finish(google_client, state).headers["location"]


def test_cancelled_and_provider_failure(google_client, monkeypatch):
    state, _ = begin(google_client)
    response = google_client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "error": "access_denied"},
    )
    assert "authError=cancelled" in response.headers["location"]
    state, _ = begin(google_client)

    def fail(*_a, **_k):
        raise RuntimeError("SECRET_TOKEN_MUST_NOT_APPEAR")

    monkeypatch.setattr(google, "exchange_and_verify", fail)
    response = finish(google_client, state)
    assert "SECRET_TOKEN" not in str(response.headers) + response.text
    assert "authError=failed" in response.headers["location"]


def test_no_email_based_merge_and_suspended_user(google_client, signer, db):
    for sub in ("first", "second"):
        state, nonce = begin(google_client)
        signer(nonce, sub=sub)
        finish(google_client, state)
    assert db.scalar(select(func.count()).select_from(User)) == 2
    identity = db.scalar(
        select(AuthIdentity).where(AuthIdentity.provider_subject == "second")
    )
    identity.user.status = "suspended"
    db.commit()
    state, nonce = begin(google_client)
    signer(nonce, sub="second")
    assert "authError=suspended" in finish(google_client, state).headers["location"]
    assert google_client.get("/api/v1/me").status_code == 401


@pytest.mark.parametrize(
    "path",
    [
        "https://evil.test",
        "//evil.test",
        "/\\evil.test",
        "/%5cevil.test",
        "/%0d%0aLocation:evil",
        "/api/v1/auth/logout",
    ],
)
def test_safe_return_path(path):
    assert google.safe_return_path(path) == "/"


def test_rate_limit_and_origin(google_client):
    for _ in range(20):
        assert google_client.get("/api/v1/auth/google/start").status_code == 302
    assert google_client.get("/api/v1/auth/google/start").status_code == 429
    assert (
        google_client.post(
            "/api/v1/auth/logout", headers={"Origin": "https://evil.test"}
        ).status_code
        == 403
    )


def test_pkce_verifier_is_sent_only_to_token_endpoint(
    google_client, signer, monkeypatch
):
    response = google_client.get("/api/v1/auth/google/start")
    query = parse_qs(urlsplit(response.headers["location"]).query)
    signer(query["nonce"][0])
    original = google.OAuth2Client.fetch_token

    def capture(self, url, **kwargs):
        assert url == google.TOKEN_URL
        challenge = (
            base64.urlsafe_b64encode(
                hashlib.sha256(kwargs["code_verifier"].encode()).digest()
            )
            .rstrip(b"=")
            .decode()
        )
        assert challenge == query["code_challenge"][0]
        return original(self, url, **kwargs)

    monkeypatch.setattr(google.OAuth2Client, "fetch_token", capture)
    assert "setup=1" in finish(google_client, query["state"][0]).headers["location"]


def test_parallel_callback_consumes_state_once(google_client, signer, db):
    state, nonce = begin(google_client)
    signer(nonce)
    browser = google_client.cookies.get("oauth_browser")

    def call():
        client = TestClient(google_client.app, follow_redirects=False)
        client.cookies.set("oauth_browser", browser)
        return finish(client, state).headers["location"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: call(), range(2)))
    assert sum("setup=1" in result for result in results) == 1
    assert db.scalar(select(func.count()).select_from(Session)) == 1
    assert db.scalar(select(func.count()).select_from(User)) == 1


def test_auth_access_log_hides_callback_query():
    configure_logging()
    record = logging.LogRecord(
        "uvicorn.access",
        logging.INFO,
        "",
        0,
        "%s %s %s %s %s",
        (
            "client",
            "GET",
            "/api/v1/auth/google/callback?code=SECRET&state=PRIVATE",
            "1.1",
            302,
        ),
        None,
    )
    for log_filter in logging.getLogger("uvicorn.access").filters:
        log_filter.filter(record)
    assert "SECRET" not in record.getMessage()
    assert "PRIVATE" not in record.getMessage()
