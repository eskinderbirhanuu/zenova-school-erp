"""add payment_sessions, receipts, receipt_lines, refunds tables + parent_id to payments

Revision ID: a1b2c3d4e5f6
Revises: 775f276ecad9
Create Date: 2026-07-05 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1b2c3d4e5f6'
down_revision = '775f276ecad9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # payment_sessions
    op.create_table('payment_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=False),
        sa.Column('invoice_id', sa.String(length=36), nullable=True),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('parent_id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.Column('amount', sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=True, server_default='ETB'),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('gateway', sa.String(length=50), nullable=False),
        sa.Column('gateway_reference', sa.String(length=255), nullable=True),
        sa.Column('gateway_response', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('webhook_received', sa.DateTime(), nullable=True),
        sa.Column('webhook_payload', sa.Text(), nullable=True),
        sa.Column('webhook_verified', sa.DateTime(), nullable=True),
        sa.Column('webhook_retry_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('webhook_last_error', sa.String(length=500), nullable=True),
        sa.Column('webhook_next_retry', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['parent_id'], ['parents.id'], ),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payment_sessions_session_id', 'payment_sessions', ['session_id'], unique=True)

    # receipts
    op.create_table('receipts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('receipt_number', sa.String(length=50), nullable=False),
        sa.Column('payment_id', sa.String(length=36), nullable=False),
        sa.Column('invoice_id', sa.String(length=36), nullable=True),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('parent_id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.Column('amount_paid', sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('payment_date', sa.DateTime(), nullable=False),
        sa.Column('transaction_id', sa.String(length=255), nullable=True),
        sa.Column('reference_number', sa.String(length=255), nullable=True),
        sa.Column('cashier_name', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('qr_code_data', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['parent_id'], ['parents.id'], ),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_receipts_receipt_number', 'receipts', ['receipt_number'], unique=True)

    # receipt_lines
    op.create_table('receipt_lines',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('receipt_id', sa.String(length=36), nullable=False),
        sa.Column('invoice_line_id', sa.String(length=36), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('amount', sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['receipt_id'], ['receipts.id'], ),
        sa.ForeignKeyConstraint(['invoice_line_id'], ['invoice_lines.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    # refunds
    op.create_table('refunds',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('refund_number', sa.String(length=50), nullable=False),
        sa.Column('payment_id', sa.String(length=36), nullable=False),
        sa.Column('receipt_id', sa.String(length=36), nullable=True),
        sa.Column('invoice_id', sa.String(length=36), nullable=True),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('parent_id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.Column('amount', sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('refund_method', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('requested_by', sa.String(length=36), nullable=False),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('processed_by', sa.String(length=36), nullable=True),
        sa.Column('transaction_reference', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
        sa.ForeignKeyConstraint(['receipt_id'], ['receipts.id'], ),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['parent_id'], ['parents.id'], ),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_refunds_refund_number', 'refunds', ['refund_number'], unique=True)

    # Add parent_id to payments (nullable for backward compat)
    op.add_column('payments', sa.Column('parent_id', sa.String(length=36), nullable=True))
    op.create_foreign_key('fk_payments_parent_id', 'payments', 'parents', ['parent_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_payments_parent_id', 'payments', type_='foreignkey')
    op.drop_column('payments', 'parent_id')
    op.drop_index('ix_refunds_refund_number', table_name='refunds')
    op.drop_table('refunds')
    op.drop_table('receipt_lines')
    op.drop_index('ix_receipts_receipt_number', table_name='receipts')
    op.drop_table('receipts')
    op.drop_index('ix_payment_sessions_session_id', table_name='payment_sessions')
    op.drop_table('payment_sessions')
