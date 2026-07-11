"""add school_id column to card_print_requests

Revision ID: c5d6e7f8a0b1
Revises: b4c5d6e7f8a0
Create Date: 2026-07-07 06:00:00.000000

"""
from alembic import op
from sqlalchemy import Column, String, ForeignKey


revision = 'c5d6e7f8a0b1'
down_revision = 'b4c5d6e7f8a0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "card_print_requests",
        Column("school_id", String(36), ForeignKey("schools.id"), nullable=True, index=True),
    )


def downgrade() -> None:
    op.drop_column("card_print_requests", "school_id")
