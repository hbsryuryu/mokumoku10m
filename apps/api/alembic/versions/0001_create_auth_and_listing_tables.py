"""会員・認証・セッション・カテゴリ・出品・オークションのテーブルを作る

Feature AUTH-002 / LST-004（テーブル設計: docs/architecture/database-schema.md）

Revision ID: 0001
Revises: 
Create Date: 2026-11-13 23:03:34.473121
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('categories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=50), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_categories')),
    sa.UniqueConstraint('name', name=op.f('uq_categories_name'))
    )
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('display_name', sa.String(length=30), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('role', sa.String(length=16), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("role IN ('member', 'admin')", name=op.f('ck_users_role')),
    sa.CheckConstraint("status IN ('active', 'suspended', 'withdrawn')", name=op.f('ck_users_status')),
    sa.CheckConstraint('display_name IS NULL OR length(display_name) BETWEEN 1 AND 30', name=op.f('ck_users_display_name_length')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_users'))
    )
    op.create_table('auth_identities',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('provider', sa.String(length=16), nullable=False),
    sa.Column('provider_subject', sa.String(length=255), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=True),
    sa.Column('email_verified', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("provider IN ('google', 'dev')", name=op.f('ck_auth_identities_provider')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_auth_identities_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_auth_identities')),
    sa.UniqueConstraint('provider', 'provider_subject', name=op.f('uq_auth_identities_provider_provider_subject'))
    )
    with op.batch_alter_table('auth_identities', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_auth_identities_user_id'), ['user_id'], unique=False)

    op.create_table('listings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('seller_id', sa.Integer(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=60), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('condition', sa.String(length=16), nullable=False),
    sa.Column('shipping_payer', sa.String(length=16), nullable=False),
    sa.Column('shipping_method', sa.String(length=80), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("condition IN ('new', 'like_new', 'some_wear', 'worn')", name=op.f('ck_listings_condition')),
    sa.CheckConstraint("shipping_payer IN ('seller', 'buyer')", name=op.f('ck_listings_shipping_payer')),
    sa.CheckConstraint("status IN ('draft', 'published', 'ended', 'suspended', 'cancelled')", name=op.f('ck_listings_status')),
    sa.CheckConstraint('length(description) BETWEEN 1 AND 500', name=op.f('ck_listings_description_length')),
    sa.CheckConstraint('length(shipping_method) BETWEEN 1 AND 80', name=op.f('ck_listings_shipping_method_length')),
    sa.CheckConstraint('length(title) BETWEEN 1 AND 60', name=op.f('ck_listings_title_length')),
    sa.CheckConstraint('version >= 1', name=op.f('ck_listings_version_positive')),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], name=op.f('fk_listings_category_id_categories')),
    sa.ForeignKeyConstraint(['seller_id'], ['users.id'], name=op.f('fk_listings_seller_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_listings'))
    )
    with op.batch_alter_table('listings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_listings_seller_id'), ['seller_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_listings_status'), ['status'], unique=False)

    op.create_table('sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_sessions_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sessions')),
    sa.UniqueConstraint('token_hash', name=op.f('uq_sessions_token_hash'))
    )
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_sessions_user_id'), ['user_id'], unique=False)

    op.create_table('auctions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('listing_id', sa.Integer(), nullable=False),
    sa.Column('start_price', sa.Integer(), nullable=False),
    sa.Column('buyout_price', sa.Integer(), nullable=True),
    sa.Column('auto_extension', sa.Boolean(), nullable=False),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('original_ends_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('end_reason', sa.String(length=16), nullable=True),
    sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("end_reason IS NULL OR end_reason IN ('expired', 'buyout', 'early_end', 'cancelled')", name=op.f('ck_auctions_end_reason')),
    sa.CheckConstraint("status IN ('scheduled', 'active', 'ended', 'suspended', 'cancelled')", name=op.f('ck_auctions_status')),
    sa.CheckConstraint('buyout_price IS NULL OR (buyout_price > start_price AND buyout_price <= 10000000)', name=op.f('ck_auctions_buyout_price_range')),
    sa.CheckConstraint('ends_at > starts_at', name=op.f('ck_auctions_ends_after_starts')),
    sa.CheckConstraint('ends_at >= original_ends_at', name=op.f('ck_auctions_ends_not_before_original')),
    sa.CheckConstraint('start_price BETWEEN 1 AND 10000000', name=op.f('ck_auctions_start_price_range')),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], name=op.f('fk_auctions_listing_id_listings')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_auctions')),
    sa.UniqueConstraint('listing_id', name=op.f('uq_auctions_listing_id'))
    )
    with op.batch_alter_table('auctions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_auctions_ends_at'), ['ends_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_auctions_status'), ['status'], unique=False)

    # ADR-0008: カテゴリの初期データ（階層なしの5種類）
    categories = sa.table(
        "categories",
        sa.column("name", sa.String),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(
        categories,
        [
            {"name": "ファッション", "sort_order": 10},
            {"name": "インテリア", "sort_order": 20},
            {"name": "本・ホビー", "sort_order": 30},
            {"name": "家電", "sort_order": 40},
            {"name": "その他", "sort_order": 90},
        ],
    )


def downgrade() -> None:
    with op.batch_alter_table('auctions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_auctions_status'))
        batch_op.drop_index(batch_op.f('ix_auctions_ends_at'))

    op.drop_table('auctions')
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_sessions_user_id'))

    op.drop_table('sessions')
    with op.batch_alter_table('listings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_listings_status'))
        batch_op.drop_index(batch_op.f('ix_listings_seller_id'))

    op.drop_table('listings')
    with op.batch_alter_table('auth_identities', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_auth_identities_user_id'))

    op.drop_table('auth_identities')
    op.drop_table('users')
    op.drop_table('categories')
