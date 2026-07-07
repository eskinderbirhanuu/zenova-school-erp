"""add deleted_at to remaining tables that were added after the initial soft-delete migration

Revision ID: 592860dea46f
Revises: d6e7f8a9b0c1
Create Date: 2026-07-05 13:41:29.017237

"""
from alembic import op
import sqlalchemy as sa


revision = '592860dea46f'
down_revision = 'd6e7f8a9b0c1'
branch_labels = None
depends_on = None

TABLES = [
    "payment_gateway_configs",
    "monthly_platform_invoices",
    "school_transactions",
    "platform_fees",
    "receipt_lines",
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column('deleted_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_column(table, 'deleted_at')
