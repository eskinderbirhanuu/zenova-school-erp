"""add device_change_requests table and review_mode/device_locked statuses

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-05 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new status values to licenses table — no schema change needed for enum
    # since SAEnum stores as string. Existing rows keep their values.

    # Add device_change columns to licenses
    op.add_column("licenses", sa.Column("device_change_reason", sa.String(255), nullable=True))
    op.add_column("licenses", sa.Column("device_change_requested_at", sa.DateTime(), nullable=True))

    # Create device_change_requests table
    op.create_table(
        "device_change_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("license_id", sa.String(36), sa.ForeignKey("licenses.id"), nullable=False, index=True),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True),
        sa.Column("old_hardware_id", sa.String(255), nullable=False),
        sa.Column("new_hardware_id", sa.String(255), nullable=True),
        sa.Column("match_count", sa.Integer(), nullable=False),
        sa.Column("total_components", sa.Integer(), nullable=False, server_default="8"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("requested_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("review_note", sa.String(500), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_device_change_requests_status_created",
        "device_change_requests", ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_device_change_requests_status_created", table_name="device_change_requests")
    op.drop_table("device_change_requests")
    op.drop_column("licenses", "device_change_requested_at")
    op.drop_column("licenses", "device_change_reason")
