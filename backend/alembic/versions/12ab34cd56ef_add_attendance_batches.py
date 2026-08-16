"""add attendance_batches for bulk-attendance idempotency

Revision ID: 12ab34cd56ef
Revises: 7c3f5a9b1d2e
Create Date: 2026-08-09 14:00:00.000000

Gap T3: an offline client replays queued bulk-attendance requests with an
X-Idempotency-Key. The key maps to the stored response so a replay is safe.
"""
from alembic import op
import sqlalchemy as sa

revision = '12ab34cd56ef'
down_revision = '7c3f5a9b1d2e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'attendance_batches',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('school_id', 'idempotency_key', name='uq_attendance_batch_key'),
    )
    op.create_index('ix_attendance_batches_school_id', 'attendance_batches', ['school_id'])


def downgrade() -> None:
    op.drop_index('ix_attendance_batches_school_id', table_name='attendance_batches')
    op.drop_table('attendance_batches')
