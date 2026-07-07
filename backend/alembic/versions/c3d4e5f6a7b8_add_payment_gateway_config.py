"""add payment_gateway_configs table for per-school gateway keys

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-05 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_gateway_configs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("school_id", sa.String(length=36), nullable=False),
        sa.Column("gateway", sa.String(length=50), nullable=False),
        sa.Column("secret_key", sa.String(length=500), nullable=True),
        sa.Column("public_key", sa.String(length=500), nullable=True),
        sa.Column("webhook_secret", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default="true"),
        sa.Column("config_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payment_gateway_configs_school_id", "payment_gateway_configs", ["school_id"])


def downgrade() -> None:
    op.drop_table("payment_gateway_configs")
