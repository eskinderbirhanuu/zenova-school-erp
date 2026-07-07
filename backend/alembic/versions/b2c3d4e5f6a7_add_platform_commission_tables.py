"""add platform commission tables: school_transactions, platform_fees, monthly_platform_invoices

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-05 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "school_transactions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("school_id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=True),
        sa.Column("invoice_id", sa.String(length=36), nullable=True),
        sa.Column("payment_id", sa.String(length=36), nullable=True),
        sa.Column("payment_method", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column("transaction_reference", sa.String(length=255), nullable=True),
        sa.Column("payment_date", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"],),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"],),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"],),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_school_transactions_school_id", "school_transactions", ["school_id"])
    op.create_index("ix_school_transactions_payment_date", "school_transactions", ["payment_date"])

    op.create_table(
        "platform_fees",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("school_id", sa.String(length=36), nullable=False),
        sa.Column("transaction_id", sa.String(length=36), nullable=False),
        sa.Column("fee_amount", sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=True, server_default="pending"),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"],),
        sa.ForeignKeyConstraint(["transaction_id"], ["school_transactions.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_platform_fees_school_id", "platform_fees", ["school_id"])
    op.create_index("ix_platform_fees_status", "platform_fees", ["status"])

    op.create_table(
        "monthly_platform_invoices",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("school_id", sa.String(length=36), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("transaction_count", sa.Integer(), nullable=False),
        sa.Column("total_amount", sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=True, server_default="pending"),
        sa.Column("invoice_number", sa.String(length=50), nullable=False),
        sa.Column("payment_reference", sa.String(length=255), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_monthly_platform_invoices_school_id", "monthly_platform_invoices", ["school_id"])
    op.create_index("ix_monthly_platform_invoices_status", "monthly_platform_invoices", ["status"])
    op.create_index("ix_monthly_platform_invoices_invoice_number", "monthly_platform_invoices", ["invoice_number"], unique=True)


def downgrade() -> None:
    op.drop_table("monthly_platform_invoices")
    op.drop_table("platform_fees")
    op.drop_table("school_transactions")
