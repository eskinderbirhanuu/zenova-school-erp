"""add runtime_environment column to licenses for VM/Docker detection

Revision ID: d5e6f7a8b9c0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-05 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d5e6f7a8b9c0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("licenses", sa.Column("runtime_environment", sa.String(20), nullable=True,
                                        comment="Detected runtime: bare_metal, vm, docker, unknown"))


def downgrade() -> None:
    op.drop_column("licenses", "runtime_environment")
