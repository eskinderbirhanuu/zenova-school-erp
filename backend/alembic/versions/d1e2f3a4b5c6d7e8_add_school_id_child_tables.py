"""add school_id to child/detail tables

Revision ID: d1e2f3a4b5c6d7e8
Revises: 73ccf4e21e6d
Create Date: 2026-06-30 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd1e2f3a4b5c6d7e8'
down_revision = '73ccf4e21e6d'
branch_labels = None
depends_on = None

TABLES = [
    "budget_items",
    "cafeteria_order_items",
    "fee_assignments",
    "fee_structures",
    "goods_receipts",
    "invoice_lines",
    "journal_lines",
    "leave_balances",
    "leave_requests",
    "notifications",
    "payroll_items",
    "semesters",
    "student_documents",
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = [t.name for t in inspector.get_table_names()]
    for table in TABLES:
        if table not in existing:
            continue
        columns = [c["name"] for c in inspector.get_columns(table)]
        if "school_id" in columns:
            continue
        op.add_column(
            table,
            sa.Column(
                "school_id",
                sa.String(36),
                sa.ForeignKey("schools.id"),
                nullable=True,
                index=True,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = [t.name for t in inspector.get_table_names()]
    for table in reversed(TABLES):
        if table not in existing:
            continue
        columns = [c["name"] for c in inspector.get_columns(table)]
        if "school_id" not in columns:
            continue
        op.drop_column(table, "school_id")
