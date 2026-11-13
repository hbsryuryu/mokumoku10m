"""出品に出品条件（開始価格・即決価格・自動延長・開催期間）を追加する

Feature LST-004（テーブル設計: docs/architecture/database-schema.md）
下書きで編集し、公開時に auctions へ写す。

注意: start_price と duration_hours は NOT NULL で既定値がないため、出品の行がすでにある DB では失敗する。
0001 の時点では出品を作る API がなかったので、通常は行がない。失敗した場合は
`docker compose down -v` で開発用の DB を作り直す（docs/runbooks/local-backend.md）。

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-13 23:15:39.995537
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PRICE_MAX = 10_000_000
DURATION_MIN_HOURS = 13
DURATION_MAX_HOURS = 7 * 24 + 11


def upgrade() -> None:
    with op.batch_alter_table('listings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('start_price', sa.Integer(), nullable=False))
        batch_op.add_column(sa.Column('buyout_price', sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column('auto_extension', sa.Boolean(), nullable=False, server_default=sa.true())
        )
        batch_op.add_column(sa.Column('duration_hours', sa.Integer(), nullable=False))
        # Alembic の autogenerate は CHECK 制約を検出しないので、手で書く。
        batch_op.create_check_constraint(
            'start_price_range', f'start_price BETWEEN 1 AND {PRICE_MAX}'
        )
        batch_op.create_check_constraint(
            'buyout_price_range',
            f'buyout_price IS NULL OR (buyout_price > start_price AND buyout_price <= {PRICE_MAX})',
        )
        batch_op.create_check_constraint(
            'duration_hours_range',
            f'duration_hours BETWEEN {DURATION_MIN_HOURS} AND {DURATION_MAX_HOURS}',
        )


def downgrade() -> None:
    with op.batch_alter_table('listings', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_listings_duration_hours_range'), type_='check')
        batch_op.drop_constraint(op.f('ck_listings_buyout_price_range'), type_='check')
        batch_op.drop_constraint(op.f('ck_listings_start_price_range'), type_='check')
        batch_op.drop_column('duration_hours')
        batch_op.drop_column('auto_extension')
        batch_op.drop_column('buyout_price')
        batch_op.drop_column('start_price')
