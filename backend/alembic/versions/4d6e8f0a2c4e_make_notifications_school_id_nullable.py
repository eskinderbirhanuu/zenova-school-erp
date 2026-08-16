"""make_notifications_school_id_nullable

Revision ID: 4d6e8f0a2c4e
Revises: 12ab34cd56ef
Create Date: 2026-08-09 17:40:00.000000

Defensive fix for a §3 dry-run 500: Notification.school_id was NOT NULL but
send_notification() never set it, so the in-app notification loop that runs
after a successful create (student_enrolled, invoice_created, exam_results,
attendance) crashed with psycopg2.errors.NotNullViolation AFTER the entity was
already committed. Callers now pass school_id explicitly; super-admin/system
notifications legitimately have no school, so make the column nullable so a
missing school id never aborts a primary transaction.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '4d6e8f0a2c4e'
down_revision = '12ab34cd56ef'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("notifications", "school_id", nullable=True)


def downgrade() -> None:
    op.alter_column("notifications", "school_id", nullable=False)
