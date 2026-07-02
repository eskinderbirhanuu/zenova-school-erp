"""sync_priority_version_conflict_log

Revision ID: fd71dab89712
Revises: af43149492e0
Create Date: 2026-07-01 16:38:22.434111

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fd71dab89712'
down_revision = 'af43149492e0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sync_queue", sa.Column("priority", sa.String(10), server_default="5", nullable=True))
    op.add_column("sync_queue", sa.Column("source_version", sa.String(20), nullable=True))
    op.create_index("ix_sync_queue_priority_created", "sync_queue", ["priority", "created_at"])
    op.create_table(
        "sync_inbound",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_server_id", sa.String(64), nullable=False, index=True),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", sa.String(36), nullable=False),
        sa.Column("operation", sa.String(20), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False, index=True),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("applied", sa.Boolean(), server_default="false"),
        sa.Column("source_version", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "conflict_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("table_name", sa.String(100), nullable=False, index=True),
        sa.Column("record_id", sa.String(36), nullable=False, index=True),
        sa.Column("local_version", sa.String(20), nullable=True),
        sa.Column("incoming_version", sa.String(20), nullable=True),
        sa.Column("local_data", sa.Text(), nullable=True),
        sa.Column("incoming_data", sa.Text(), nullable=True),
        sa.Column("source_server_id", sa.String(64), nullable=True),
        sa.Column("resolution", sa.String(20), server_default="unresolved"),
        sa.Column("resolved_by", sa.String(36), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("conflict_logs")
    op.drop_table("sync_inbound")
    op.drop_index("ix_sync_queue_priority_created")
    op.drop_column("sync_queue", "source_version")
    op.drop_column("sync_queue", "priority")
