"""オークション単位の悲観ロック（ADR-0006、docs/architecture/auction-bid-transaction.md）。

SQLite3 と PostgreSQL のロックの違いは、この関数1か所に閉じ込める。

- PostgreSQL: Auction の行を `SELECT ... FOR UPDATE` でロックする
- SQLite3: 行ロックがないため、トランザクションを `BEGIN IMMEDIATE` で始めて書き込みを予約する
  （DB 全体の書き込みが1つずつになる）

入札・終了処理・出品の取り下げ・運営停止など、同じオークションの状態を変える処理は、
必ず最初にこの関数でロックを取ってから状態を確認する。ロックはコミットまたはロールバックで外れる。
"""

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.models import Auction, Listing


class LockOrderError(RuntimeError):
    """ロックを取る前に、変更中のデータがあるときのエラー（実装の誤り）。"""


def begin_locked_transaction(db: DbSession) -> None:
    """これから書き込みのためのロックを取る準備をする。

    SQLite3 では BEGIN IMMEDIATE をトランザクションの最初に出す必要がある。ログイン確認などの読み込みで
    すでにトランザクションが始まっている場合は、いったん終えてから始め直す。
    """
    if db.new or db.dirty or db.deleted:
        raise LockOrderError("ロックを取る前に、未保存の変更があります")
    if db.in_transaction():
        # 読み込みだけのトランザクションなので、終えても失うものはない。
        db.rollback()
    if db.get_bind().dialect.name == "sqlite":
        # Python の sqlite3 は書き込みの直前に BEGIN を出すが、ここでは先に BEGIN IMMEDIATE を出して
        # 書き込みを予約する。コミット・ロールバックは通常どおり Session から行う。
        db.connection().exec_driver_sql("BEGIN IMMEDIATE")


def lock_auction(db: DbSession, auction_id: int) -> Auction | None:
    """オークションをロックして、最新の状態を読み直して返す。"""
    begin_locked_transaction(db)
    statement = select(Auction).where(Auction.id == auction_id).execution_options(populate_existing=True)
    if db.get_bind().dialect.name != "sqlite":
        statement = statement.with_for_update()
    return db.scalar(statement)


def lock_auction_with_listing(db: DbSession, auction_id: int) -> tuple[Auction, Listing] | None:
    """オークションと出品を `Auction -> Listing` の順にロックして、両方の最新の状態を返す。

    トランザクション設計 5章のロック順。入札・終了処理・早期終了・取り下げで使う。
    """
    auction = lock_auction(db, auction_id)
    if auction is None:
        return None
    statement = (
        select(Listing).where(Listing.id == auction.listing_id).execution_options(populate_existing=True)
    )
    if db.get_bind().dialect.name != "sqlite":
        statement = statement.with_for_update()
    return auction, db.scalar(statement)
