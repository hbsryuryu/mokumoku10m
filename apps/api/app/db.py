from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """全モデルの基底クラス。Alembic はこの metadata からマイグレーションを作る。"""


def _create_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        # FastAPI はリクエストを別スレッドで処理するため、SQLite3 の同一スレッド制限を外す。
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, _connection_record):
            # ADR-0006: 外部キー制約を有効にし（標準では無効）、WAL で読み書きを並行させる。
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys = ON")
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.close()

        return engine
    return create_engine(url, pool_pre_ping=True)


engine = _create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
