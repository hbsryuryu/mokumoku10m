"""Feature AUTH-002: 開発用ログインとセッションのテスト（ADR-0008）。"""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.config import Settings, UnsafeSettingsError, validate_settings
from app.db import utcnow
from app.main import create_app
from app.models import AuthIdentity, Session, User


def login(client: TestClient, name: str = "seller1"):
    return client.post("/api/v1/dev/login", json={"display_name": name})


# --- 安全策 -------------------------------------------------------------------


@pytest.mark.parametrize("app_env", ["production", "staging", "LOCAL", ""])
def test_dev_login_refuses_to_start_outside_local(app_env):
    settings = Settings(app_env=app_env, dev_login_enabled=True)
    with pytest.raises(UnsafeSettingsError):
        validate_settings(settings)
    with pytest.raises(UnsafeSettingsError):
        create_app(settings)


def test_app_env_defaults_to_production(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    assert Settings(_env_file=None).app_env == "production"


def test_empty_env_values_fall_back_to_defaults(monkeypatch):
    # `.env.example` を写して値を空にしたままでも起動できること
    monkeypatch.setenv("APP_ENV", "")
    monkeypatch.setenv("DEV_LOGIN_ENABLED", "")
    settings = Settings(_env_file=None)
    assert settings.app_env == "production"
    assert settings.dev_login_enabled is False


def test_dev_login_route_does_not_exist_when_disabled():
    client = TestClient(create_app(Settings(app_env="local", dev_login_enabled=False)))
    assert login(client).status_code == 404


def test_session_cookie_is_secure_outside_local():
    settings = Settings(app_env="production")
    assert settings.session_cookie_secure is True
    assert settings.session_cookie_name == "__Host-session"


# --- ログイン・セッション ------------------------------------------------------


def test_dev_login_creates_user_and_session(client, db):
    response = login(client, "seller1")

    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "seller1"
    assert body["role"] == "member"
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie

    identity = db.scalar(select(AuthIdentity).where(AuthIdentity.provider_subject == "seller1"))
    assert identity.provider == "dev"
    assert db.scalar(select(func.count()).select_from(Session)) == 1


def test_session_token_is_stored_only_as_hash(client, db):
    response = login(client)
    token = client.cookies.get("session")

    stored = db.scalar(select(Session.token_hash))
    assert token and stored != token
    assert len(stored) == 64
    assert response.status_code == 200


def test_same_display_name_logs_in_as_same_user(client, db):
    first = login(client, "buyer1").json()
    second = login(client, "buyer1").json()

    assert first["id"] == second["id"]
    assert db.scalar(select(func.count()).select_from(User)) == 1


def test_me_returns_logged_in_user(client):
    user = login(client, "buyer1").json()

    response = client.get("/api/v1/me")

    assert response.status_code == 200
    assert response.json() == user


def test_me_requires_login(client):
    response = client.get("/api/v1/me")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "NOT_AUTHENTICATED"


def test_logout_revokes_session(client, db):
    login(client)
    token = client.cookies.get("session")

    assert client.post("/api/v1/auth/logout").status_code == 204

    # Cookie を消されても、古いトークンを持ち続ける攻撃者を想定して、元のトークンで確認する。
    client.cookies.set("session", token)
    assert client.get("/api/v1/me").status_code == 401
    assert db.scalar(select(Session.revoked_at)) is not None


def test_expired_session_is_rejected(client, db):
    login(client)
    session = db.scalar(select(Session))
    session.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()

    assert client.get("/api/v1/me").status_code == 401


def test_suspended_user_is_logged_out_and_cannot_log_in(client, db):
    login(client, "bad_user")
    user = db.scalar(select(User))
    user.status = "suspended"
    db.commit()

    assert client.get("/api/v1/me").status_code == 401
    response = login(client, "bad_user")
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "ACCOUNT_SUSPENDED"


@pytest.mark.parametrize("name", ["", "x" * 31])
def test_display_name_length_is_validated(client, name):
    assert login(client, name).status_code == 422
