"""make_audit_record_id_nullable

Revision ID: 7c3f5a9b1d2e
Revises: 9a4b5c6d7e8f
Create Date: 2026-08-09 12:30:00.000000

Fix for the §3 dry-run P0 bug: audit_logs.record_id was NOT NULL but many
create-paths log an audit row before the entity is flushed, so obj.id is still
None at audit time (all models use flush-time UUID defaults). This crashed
create_school (setup/school) and any other create flow that audits before
flush with psycopg2.errors.NotNullViolation.

record_id is now nullable so a missing record id never aborts the transaction.
Create-paths that can flush first (student, school, cards, etc.) already do so
and keep a populated record_id; the remaining paths degrade gracefully.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '7c3f5a9b1d2e'
down_revision = '9a4b5c6d7e8f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("audit_logs", "record_id", nullable=True)


def downgrade() -> None:
    op.alter_column("audit_logs", "record_id", nullable=False)
