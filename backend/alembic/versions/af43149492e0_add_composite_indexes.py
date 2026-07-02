"""add composite indexes + missing school_id columns

Revision ID: af43149492e0
Revises: 9e8f7a6b5c4d3e2f
Create Date: 2026-07-01 14:37:40.645899

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "af43149492e0"
down_revision = "9e8f7a6b5c4d3e2f"
branch_labels = None
depends_on = None

INDEXES = [
    ("ix_attendance_school_student", "attendance", ["school_id", "student_id"]),
    ("ix_attendance_student_date", "attendance", ["student_id", "date"]),
    ("ix_notifications_school_user", "notifications", ["school_id", "user_id"]),
    ("ix_notifications_user_created", "notifications", ["user_id", "created_at"]),
    ("ix_audit_logs_table_record", "audit_logs", ["table_name", "record_id"]),
    ("ix_audit_logs_user_action", "audit_logs", ["user_id", "action"]),
    ("ix_payments_school_invoice", "payments", ["school_id", "invoice_id"]),
    ("ix_payments_school_student", "payments", ["school_id", "student_id"]),
    ("ix_invoices_school_student", "invoices", ["school_id", "student_id"]),
    ("ix_invoices_school_status", "invoices", ["school_id", "status"]),
    ("ix_journal_entries_school_date", "journal_entries", ["school_id", "entry_date"]),
    ("ix_wallet_tx_wallet_created", "wallet_transactions", ["wallet_id", "created_at"]),
    ("ix_sync_queue_status_created", "sync_queue", ["status", "created_at"]),
    ("ix_students_school_status", "students", ["school_id", "status"]),
    ("ix_students_school_class", "students", ["school_id", "grade_id"]),
]

# Tables where school_id was stamped but never actually added
MISSING_SCHOOL_ID = [
    "budget_items", "cafeteria_order_items", "fee_assignments",
    "fee_structures", "goods_receipts", "invoice_lines",
    "journal_lines", "leave_balances", "leave_requests",
    "notifications", "payroll_items", "semesters",
]


def column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    r = conn.execute(
        text("SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c"),
        {"t": table, "c": column},
    )
    return r.fetchone() is not None


def upgrade() -> None:
    op.execute("SET client_min_messages TO WARNING")

    for table in MISSING_SCHOOL_ID:
        if not column_exists(table, "school_id"):
            op.add_column(
                table,
                sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True),
            )

    for name, table, columns in INDEXES:
        if name == "ix_notifications_school_user" and not column_exists("notifications", "school_id"):
            continue
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({', '.join(columns)})")


def downgrade() -> None:
    op.execute("SET client_min_messages TO WARNING")
    for name, _, _ in INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name}")
    for table in MISSING_SCHOOL_ID:
        if column_exists(table, "school_id"):
            op.drop_column(table, "school_id")
