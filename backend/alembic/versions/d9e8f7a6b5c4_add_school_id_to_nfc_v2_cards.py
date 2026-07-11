"""add school_id to NFC v2 card tables

Revision ID: d9e8f7a6b5c4
Revises: a8b9c0d1e2f3
Create Date: 2026-07-11 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd9e8f7a6b5c4'
down_revision = 'a8b9c0d1e2f3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("student_cards", sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True))
    op.add_column("staff_cards", sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True))
    op.add_column("parent_cards", sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True))
    op.add_column("employee_cards", sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column("employee_cards", "school_id")
    op.drop_column("parent_cards", "school_id")
    op.drop_column("staff_cards", "school_id")
    op.drop_column("student_cards", "school_id")
