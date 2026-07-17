"""add_password_recovery_tables

Revision ID: 6d478aefeea0
Revises: fd71dab89712
Create Date: 2026-07-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "6d478aefeea0"
down_revision = "fd71dab89712"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "password_reset_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("initiated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("method", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("token_hash", sa.String(255), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(), nullable=True),
        sa.Column("temp_password_hash", sa.String(255), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("device_info", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_password_reset_requests_status", "password_reset_requests", ["status"])

    op.create_table(
        "recovery_codes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("code_hash", sa.String(255), nullable=False),
        sa.Column("code_prefix", sa.String(8), nullable=False),
        sa.Column("is_used", sa.Boolean(), default=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("used_by_ip", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_recovery_codes_used", "recovery_codes", ["is_used"])

    op.create_table(
        "password_audit",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True),
        sa.Column("action", sa.String(50), nullable=False, index=True),
        sa.Column("target_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("initiated_by_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_by_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, index=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("password_audit")
    op.drop_table("recovery_codes")
    op.drop_table("password_reset_requests")
