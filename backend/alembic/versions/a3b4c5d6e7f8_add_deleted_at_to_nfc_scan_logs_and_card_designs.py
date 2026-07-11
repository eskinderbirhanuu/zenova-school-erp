"""add deleted_at to nfc_scan_logs and card_designs

Revision ID: a3b4c5d6e7f8
Revises: 824e09b38d35
Create Date: 2026-07-07 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a3b4c5d6e7f8'
down_revision = '824e09b38d35'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('nfc_scan_logs', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('card_designs', sa.Column('deleted_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('card_designs', 'deleted_at')
    op.drop_column('nfc_scan_logs', 'deleted_at')
