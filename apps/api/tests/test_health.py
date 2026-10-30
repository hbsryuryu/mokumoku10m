from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_sqlite_foreign_keys_enabled():
    from sqlalchemy import text

    from app.db import engine

    if engine.dialect.name != "sqlite":
        return
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_keys")).scalar() == 1
