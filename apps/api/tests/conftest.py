"""テスト共通の準備。

- テスト専用の SQLite3 ファイルを一時フォルダに作り、開発用の DB には触れない。
- テーブルは本番と同じく Alembic のマイグレーションで作る（マイグレーション自体のテストも兼ねる）。
- 各テストの後に、初期データ（カテゴリ）以外の行を消す。
"""

import os
import tempfile
from pathlib import Path

# app を import する前に環境変数を決める（DB の接続先は import 時に決まるため）。
_TMP_DIR = tempfile.mkdtemp(prefix="mokumoku-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TMP_DIR) / 'test.sqlite3'}"
os.environ["APP_ENV"] = "local"
os.environ["DEV_LOGIN_ENABLED"] = "true"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import delete  # noqa: E402

from app.config import Settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import Auction, AuthIdentity, Listing, Session, User  # noqa: E402

API_DIR = Path(__file__).resolve().parents[1]


def alembic_config() -> Config:
    config = Config(str(API_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(API_DIR / "alembic"))
    return config


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    command.upgrade(alembic_config(), "head")
    yield


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    with SessionLocal() as db:
        # 外部キーの依存の逆順に消す。カテゴリは初期データなので残す。
        for model in (Auction, Listing, Session, AuthIdentity, User):
            db.execute(delete(model))
        db.commit()


@pytest.fixture
def local_settings() -> Settings:
    return Settings(app_env="local", dev_login_enabled=True)


@pytest.fixture
def client(local_settings) -> TestClient:
    return TestClient(create_app(local_settings))


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session
