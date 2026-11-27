from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_local_frontend_serves_only_named_assets(tmp_path):
    for filename in ("index.html", "app.js", "styles.css"):
        (tmp_path / filename).write_text(f"asset: {filename}", encoding="utf-8")
    (tmp_path / ".env").write_text("must-not-be-public", encoding="utf-8")
    client = TestClient(create_app(Settings(
        app_env="local", dev_login_enabled=True, frontend_directory=str(tmp_path),
    )))
    for path in ("/", "/index.html", "/app.js", "/styles.css"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
    for path in ("/.env", "/app/config.py", "/frontend/.env"):
        assert client.get(path).status_code == 404


def test_production_does_not_expose_local_frontend():
    client = TestClient(create_app(Settings(app_env="production", dev_login_enabled=False)))
    for path in ("/", "/app.js", "/api/v1/frontend-config", "/api/v1/dev/login"):
        assert client.get(path).status_code == 404


def test_frontend_config_respects_disabled_dev_login():
    client = TestClient(create_app(Settings(app_env="local", dev_login_enabled=False)))
    assert client.get("/api/v1/frontend-config").json() == {"devLoginEnabled": False}


def test_local_browser_writes_require_same_origin(client):
    body = {"displayName": "frontend-origin-check"}
    for origin in ("https://untrusted.example", "http://testserver:5500"):
        response = client.post("/api/v1/dev/login", json=body, headers={"Origin": origin})
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "ORIGIN_NOT_ALLOWED"
        assert client.get("/api/v1/me").status_code == 401
    assert client.post(
        "/api/v1/dev/login", json=body, headers={"Origin": "http://testserver"},
    ).status_code == 200
    assert client.get("/api/v1/me").status_code == 200


def test_configured_web_origin_is_allowed():
    """Next.js（apps/web）から /api/* を転送したときのブラウザの Origin を、設定で許可できる（ADR-0010）。"""
    client = TestClient(create_app(Settings(
        app_env="local", dev_login_enabled=True, allowed_origins="http://localhost:3000, http://127.0.0.1:3000/",
    )))
    for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        response = client.post(
            "/api/v1/dev/login", json={"displayName": "web-user"}, headers={"Origin": origin}
        )
        assert response.status_code == 200, origin
    other = client.post("/api/v1/dev/login", json={"displayName": "x"}, headers={"Origin": "http://localhost:4000"})
    assert other.status_code == 403
    assert other.json()["error"]["code"] == "ORIGIN_NOT_ALLOWED"
