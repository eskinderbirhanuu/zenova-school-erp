"""add deleted_at column to 3 remaining tables (archive_jobs, archived_records, password_history)

Revision ID: a1b2c3d4e5f6a7b8
Revises: a0b1c2d3e4f5
Create Date: 2026-07-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6a7b8'
down_revision = 'a0b1c2d3e4f5'
branch_labels = None
depends_on = None

TABLES = [
    "archive_jobs",
    "archived_records",
    "password_history",
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(
            table,
            sa.Column('deleted_at', sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_column(table, 'deleted_at')
