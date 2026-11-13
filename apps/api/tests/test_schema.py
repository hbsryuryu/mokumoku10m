"""テーブル定義（DB の制約）のテスト。アプリの入力チェックをすり抜けても、DB が不正な値を拒否することを確かめる。"""

from datetime import datetime, timedelta, timezone

import pytest
from alembic import command
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.exc import IntegrityError

from app.db import utcnow
from app.models import Auction, AuthIdentity, Category, Listing, User
from tests.conftest import alembic_config


def make_user(db, name="seller1") -> User:
    user = User(display_name=name)
    db.add(user)
    db.flush()
    return user


def make_listing(db, seller: User, **overrides) -> Listing:
    category = db.scalar(select(Category).order_by(Category.sort_order))
    values = dict(
        seller_id=seller.id,
        category_id=category.id,
        title="木の持ち手の小さなかご",
        description="数回使用しました。",
        condition="like_new",
        shipping_payer="seller",
        shipping_method="ゆうパケット",
    )
    values.update(overrides)
    listing = Listing(**values)
    db.add(listing)
    db.flush()
    return listing


def assert_rejected(db, obj):
    db.add(obj)
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_categories_are_seeded(db):
    names = db.scalars(select(Category.name).order_by(Category.sort_order)).all()
    assert names == ["ファッション", "インテリア", "本・ホビー", "家電", "その他"]


def test_same_provider_subject_cannot_create_two_users(db):
    user1, user2 = make_user(db, "a"), make_user(db, "b")
    db.add(AuthIdentity(user_id=user1.id, provider="google", provider_subject="sub-1"))
    db.flush()
    assert_rejected(db, AuthIdentity(user_id=user2.id, provider="google", provider_subject="sub-1"))


def test_unknown_provider_is_rejected(db):
    user = make_user(db)
    assert_rejected(db, AuthIdentity(user_id=user.id, provider="twitter", provider_subject="x"))


def test_foreign_keys_are_enforced(db):
    # ADR-0006: SQLite3 でも外部キー制約が有効になっていること
    assert_rejected(db, AuthIdentity(user_id=999_999, provider="dev", provider_subject="ghost"))


@pytest.mark.parametrize(
    "overrides",
    [
        {"title": ""},
        {"title": "あ" * 61},
        {"description": "あ" * 501},
        {"condition": "broken"},
        {"shipping_payer": "nobody"},
        {"version": 0},
    ],
)
def test_listing_constraints(db, overrides):
    seller = make_user(db)
    db.commit()
    with pytest.raises(IntegrityError):
        make_listing(db, seller, **overrides)
    db.rollback()


def test_listing_defaults(db):
    listing = make_listing(db, make_user(db))
    assert listing.status == "draft"
    assert listing.version == 1


def make_auction(listing, **overrides) -> Auction:
    now = utcnow()
    values = dict(
        listing_id=listing.id,
        start_price=1000,
        starts_at=now,
        ends_at=now + timedelta(days=3),
        original_ends_at=now + timedelta(days=3),
    )
    values.update(overrides)
    return Auction(**values)


@pytest.mark.parametrize(
    "overrides",
    [
        {"start_price": 0},
        {"start_price": 10_000_001},
        {"buyout_price": 1000},  # 開始価格と同じ（より高くないといけない）
        {"buyout_price": 10_000_001},
        {"status": "unknown"},
    ],
)
def test_auction_constraints(db, overrides):
    listing = make_listing(db, make_user(db))
    db.commit()
    assert_rejected(db, make_auction(listing, **overrides))


def test_one_auction_per_listing(db):
    listing = make_listing(db, make_user(db))
    db.add(make_auction(listing))
    db.flush()
    assert_rejected(db, make_auction(listing))


def test_auction_defaults_follow_adr_0007(db):
    listing = make_listing(db, make_user(db))
    auction = make_auction(listing)
    db.add(auction)
    db.flush()
    assert auction.auto_extension is True
    assert auction.status == "active"


def test_datetimes_are_returned_in_utc(db):
    user = make_user(db)
    db.commit()
    db.expire_all()
    loaded = db.get(User, user.id)
    assert loaded.created_at.tzinfo == timezone.utc


def test_naive_datetime_is_rejected(db):
    user = User(display_name="x", created_at=datetime(2026, 1, 1))
    db.add(user)
    with pytest.raises(Exception, match="タイムゾーン"):
        db.flush()
    db.rollback()


def test_migration_can_downgrade_and_upgrade(tmp_path, monkeypatch):
    """マイグレーションを空の DB に適用し、元に戻せることを確かめる（別の DB ファイルで実行）。"""
    import app.db

    url = f"sqlite:///{tmp_path / 'migration.sqlite3'}"
    other_engine = create_engine(url)
    monkeypatch.setattr(app.db, "engine", other_engine)
    # alembic/env.py は実行のたびに app.db.engine を読むので、差し替えた DB に適用される。
    config = alembic_config()
    command.upgrade(config, "head")
    assert "auctions" in inspect(other_engine).get_table_names()
    command.downgrade(config, "base")
    assert inspect(other_engine).get_table_names() == ["alembic_version"]
    command.upgrade(config, "head")
