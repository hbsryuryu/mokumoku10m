"""オークションの悲観ロック（app.locking）のテスト。

SQLite3 では、ロック中はほかの接続が書き込みを始められないこと（BEGIN IMMEDIATE）を確かめる。
PostgreSQL の行ロックの動きは、移行前に PostgreSQL でのテストで確認する（ADR-0006）。
"""

import sqlite3
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.db import SessionLocal, engine, utcnow
from app.locking import LockOrderError, lock_auction
from app.models import Auction, Category, Listing, User

pytestmark = pytest.mark.skipif(engine.dialect.name != "sqlite", reason="SQLite3 のロックのテスト")


def make_auction(db) -> Auction:
    user = User(display_name="seller")
    db.add(user)
    db.flush()
    listing = Listing(
        seller_id=user.id,
        category_id=db.scalar(select(Category.id)),
        title="かご",
        description="説明",
        condition="new",
        shipping_payer="seller",
        shipping_method="ゆうパケット",
        start_price=1000,
        duration_hours=24,
        status="published",
    )
    db.add(listing)
    db.flush()
    now = utcnow()
    auction = Auction(
        listing_id=listing.id,
        start_price=1000,
        starts_at=now,
        ends_at=now + timedelta(days=1),
        original_ends_at=now + timedelta(days=1),
        current_price=1000,
    )
    db.add(auction)
    db.commit()
    return auction


def other_connection_can_start_writing() -> bool:
    path = engine.url.database
    other = sqlite3.connect(path, timeout=0, isolation_level=None)
    try:
        other.execute("BEGIN IMMEDIATE")
        other.execute("ROLLBACK")
        return True
    except sqlite3.OperationalError as error:
        assert "locked" in str(error)
        return False
    finally:
        other.close()


def test_lock_blocks_other_writers_until_commit():
    with SessionLocal() as db:
        auction_id = make_auction(db).id

    with SessionLocal() as db:
        db.scalar(select(User))  # ログイン確認などで、先に読み込みのトランザクションが始まっている状態
        locked = lock_auction(db, auction_id)
        assert locked.id == auction_id
        assert other_connection_can_start_writing() is False
        db.commit()

    assert other_connection_can_start_writing() is True


def test_lock_rereads_latest_state():
    with SessionLocal() as db:
        auction_id = make_auction(db).id

    with SessionLocal() as db:
        stale = db.get(Auction, auction_id)
        with SessionLocal() as other:
            other.get(Auction, auction_id).status = "suspended"
            other.commit()
        assert stale.status == "active"
        assert lock_auction(db, auction_id).status == "suspended"
        db.rollback()


def test_lock_refuses_when_unsaved_changes_exist():
    with SessionLocal() as db:
        db.add(User(display_name="unsaved"))
        with pytest.raises(LockOrderError):
            lock_auction(db, 1)
        db.rollback()


def test_normal_transactions_do_not_block_writers():
    with SessionLocal() as db:
        db.scalar(select(User))
        assert other_connection_can_start_writing() is True
        db.rollback()


def test_read_then_write_after_other_commit_succeeds():
    """API のよくある流れ（ログイン確認で読む → ほかのリクエストが書く → こちらも書く）で失敗しないこと。

    SQLite3 の WAL で、読み込みから始めたトランザクションが古い状態のまま書き込もうとすると
    `database is locked` になる。読み込みをトランザクションの外で行う設定（app/db.py）の確認。
    """
    with SessionLocal() as db, SessionLocal() as other:
        db.scalar(select(User))
        other.add(User(display_name="other"))
        other.commit()
        db.add(User(display_name="me"))
        db.commit()
