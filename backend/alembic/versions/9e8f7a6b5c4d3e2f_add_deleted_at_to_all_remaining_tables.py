"""add deleted_at column to all remaining tables

Revision ID: 9e8f7a6b5c4d3e2f
Revises: d1e2f3a4b5c6d7e8
Create Date: 2026-06-30 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '9e8f7a6b5c4d3e2f'
down_revision = 'd1e2f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in TABLES:
        op.add_column(
            table,
            sa.Column('deleted_at', sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_column(table, 'deleted_at')


TABLES = [
    "academic_years",
    "accounting_periods",
    "accounts",
    "announcements",
    "assignments",
    "attendance",
    "audit_logs",
    "book_borrowings",
    "book_categories",
    "books",
    "budget_items",
    "budgets",
    "cafeteria_order_items",
    "cafeteria_orders",
    "cafeteria_products",
    "classes",
    "classrooms",
    "employee_contracts",
    "events",
    "exam_results",
    "exam_types",
    "exams",
    "fee_assignments",
    "fee_structures",
    "fee_types",
    "goods_receipts",
    "inventory_assets",
    "inventory_categories",
    "inventory_items",
    "invoice_lines",
    "invoices",
    "job_postings",
    "journal_entries",
    "journal_lines",
    "leave_balances",
    "leave_requests",
    "leave_types",
    "library_fines",
    "library_members",
    "licenses",
    "messages",
    "nfc_cards",
    "notifications",
    "number_sequences",
    "parent_student_links",
    "payments",
    "payroll_items",
    "payroll_runs",
    "performance_reviews",
    "promotion_records",
    "purchase_orders",
    "purchase_requests",
    "qr_codes",
    "report_cards",
    "reports",
    "roles",
    "scholarships",
    "sections",
    "semesters",
    "staff_profiles",
    "stock_movements",
    "subjects",
    "suppliers",
    "support_tickets",
    "teacher_grade_assignments",
    "teacher_profiles",
    "teacher_section_assignments",
    "timetable_entries",
    "wallet_transactions",
    "wallets",
]
