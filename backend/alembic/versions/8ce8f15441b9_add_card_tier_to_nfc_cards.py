"""add_card_tier_to_nfc_cards

Standard (MIFARE Classic 1K) vs Premium (MIFARE DESFire EV2) NFC card tiers.

Revision ID: 8ce8f15441b9
Revises: 960fd8c2c236
Create Date: 2026-07-06 07:25:16.012985

"""
from alembic import op
import sqlalchemy as sa


revision = '8ce8f15441b9'
down_revision = '960fd8c2c236'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('student_cards', sa.Column('card_tier', sa.String(length=20),
                  nullable=True, server_default='standard'))
    op.add_column('staff_cards', sa.Column('card_tier', sa.String(length=20),
                  nullable=True, server_default='standard'))
    op.add_column('parent_cards', sa.Column('card_tier', sa.String(length=20),
                  nullable=True, server_default='standard'))
    op.add_column('employee_cards', sa.Column('card_tier', sa.String(length=20),
                  nullable=True, server_default='standard'))


def downgrade() -> None:
    op.drop_column('student_cards', 'card_tier')
    op.drop_column('staff_cards', 'card_tier')
    op.drop_column('parent_cards', 'card_tier')
    op.drop_column('employee_cards', 'card_tier')
