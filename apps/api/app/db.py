from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import DateTime, MetaData, create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from app.config import get_settings

# 制約に決まった名前を付ける。名前がないと、SQLite3 の batch モードや
# PostgreSQL への移行時に、Alembic が制約を特定できなくなる（ADR-0006）。
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """全モデルの基底クラス。Alembic はこの metadata からマイグレーションを作る。"""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class UTCDateTime(TypeDecorator):
    """日時を必ず UTC で保存・取得する型（ADR-0006: SQLite3 には日時型がないため）。

    タイムゾーンなしの日時を渡すとエラーにする。取り出した値は UTC のタイムゾーン付きで返す。
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("タイムゾーンのない日時は保存できません（UTC で渡してください）")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            # SQLite3 はタイムゾーンを保存しないため、UTC として読み直す。
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
            # 注意: Python の sqlite3 の既定の動き（読み込みはトランザクションの外、書き込みの直前に BEGIN）を
            # 変えないこと。すべてのトランザクションを BEGIN で始めると、WAL では「読み込みで始めた
            # トランザクションが、ほかの接続の書き込みのあとで書き込もうとする」と即座に
            # `database is locked` になる。書き込みの予約（BEGIN IMMEDIATE）は app.locking で行う。

        return engine
    return create_engine(url, pool_pre_ping=True)


engine = _create_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """リクエストごとに DB セッションを渡す FastAPI の依存関数。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
