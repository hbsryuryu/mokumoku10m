"""入札・入札リクエスト（冪等性）・取引のテーブルと、オークションの集計列を追加する

Feature BID-001（テーブル設計: docs/architecture/database-schema.md）
既存のオークションは、現在の価格＝開始価格、入札数＝0 で埋める（出品済みの開発用 DB でも失敗しない）。

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-13 14:59:54.399536
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('bids',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('auction_id', sa.Integer(), nullable=False),
    sa.Column('bidder_id', sa.Integer(), nullable=False),
    sa.Column('max_amount', sa.Integer(), nullable=False),
    sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint('max_amount BETWEEN 1 AND 10000000', name=op.f('ck_bids_max_amount_range')),
    sa.ForeignKeyConstraint(['auction_id'], ['auctions.id'], name=op.f('fk_bids_auction_id_auctions')),
    sa.ForeignKeyConstraint(['bidder_id'], ['users.id'], name=op.f('fk_bids_bidder_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_bids'))
    )
    with op.batch_alter_table('bids', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_bids_auction_id'), ['auction_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_bids_bidder_id'), ['bidder_id'], unique=False)

    op.create_table('orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('auction_id', sa.Integer(), nullable=False),
    sa.Column('listing_id', sa.Integer(), nullable=False),
    sa.Column('buyer_id', sa.Integer(), nullable=False),
    sa.Column('seller_id', sa.Integer(), nullable=False),
    sa.Column('amount', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('title', sa.String(length=60), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('condition', sa.String(length=16), nullable=False),
    sa.Column('shipping_payer', sa.String(length=16), nullable=False),
    sa.Column('shipping_method', sa.String(length=80), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('awaiting_payment', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed', 'refunded')", name=op.f('ck_orders_status')),
    sa.CheckConstraint('amount BETWEEN 1 AND 10000000', name=op.f('ck_orders_amount_range')),
    sa.CheckConstraint('buyer_id <> seller_id', name=op.f('ck_orders_buyer_is_not_seller')),
    sa.ForeignKeyConstraint(['auction_id'], ['auctions.id'], name=op.f('fk_orders_auction_id_auctions')),
    sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], name=op.f('fk_orders_buyer_id_users')),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], name=op.f('fk_orders_listing_id_listings')),
    sa.ForeignKeyConstraint(['seller_id'], ['users.id'], name=op.f('fk_orders_seller_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_orders')),
    sa.UniqueConstraint('auction_id', name=op.f('uq_orders_auction_id'))
    )
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_orders_buyer_id'), ['buyer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_orders_seller_id'), ['seller_id'], unique=False)

    op.create_table('bid_requests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('auction_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('idempotency_key', sa.String(length=64), nullable=False),
    sa.Column('request_hash', sa.String(length=64), nullable=False),
    sa.Column('status_code', sa.Integer(), nullable=False),
    sa.Column('response_body', sa.Text(), nullable=False),
    sa.Column('bid_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['auction_id'], ['auctions.id'], name=op.f('fk_bid_requests_auction_id_auctions')),
    sa.ForeignKeyConstraint(['bid_id'], ['bids.id'], name=op.f('fk_bid_requests_bid_id_bids')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_bid_requests_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_bid_requests')),
    sa.UniqueConstraint('auction_id', 'user_id', 'idempotency_key', name=op.f('uq_bid_requests_auction_id_user_id_idempotency_key'))
    )
    # 既存の行があっても追加できるよう、いったん NULL 可で追加してから値を埋め、NOT NULL にする。
    with op.batch_alter_table('auctions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_price', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('highest_bidder_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('bid_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.create_foreign_key(batch_op.f('fk_auctions_highest_bidder_id_users'), 'users', ['highest_bidder_id'], ['id'])
    op.execute('UPDATE auctions SET current_price = start_price WHERE current_price IS NULL')
    with op.batch_alter_table('auctions', schema=None) as batch_op:
        batch_op.alter_column('current_price', existing_type=sa.Integer(), nullable=False)
        # Alembic の autogenerate は CHECK 制約を検出しないので、手で書く。
        batch_op.create_check_constraint(
            'current_price_range', 'current_price >= start_price AND current_price <= 10000000'
        )
        batch_op.create_check_constraint('bid_count_non_negative', 'bid_count >= 0')



def downgrade() -> None:
    with op.batch_alter_table('auctions', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_auctions_bid_count_non_negative'), type_='check')
        batch_op.drop_constraint(op.f('ck_auctions_current_price_range'), type_='check')
        batch_op.drop_constraint(batch_op.f('fk_auctions_highest_bidder_id_users'), type_='foreignkey')
        batch_op.drop_column('bid_count')
        batch_op.drop_column('highest_bidder_id')
        batch_op.drop_column('current_price')

    op.drop_table('bid_requests')
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_orders_seller_id'))
        batch_op.drop_index(batch_op.f('ix_orders_buyer_id'))

    op.drop_table('orders')
    with op.batch_alter_table('bids', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_bids_bidder_id'))
        batch_op.drop_index(batch_op.f('ix_bids_auction_id'))

    op.drop_table('bids')
