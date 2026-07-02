"""add_archive_tables

Revision ID: 775f276ecad9
Revises: 931f2054f522
Create Date: 2026-07-01 17:37:38.630748

"""
from alembic import op
import sqlalchemy as sa


revision = '775f276ecad9'
down_revision = '931f2054f522'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('archive_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('table_name', sa.String(length=100), nullable=False),
        sa.Column('cutoff_date', sa.DateTime(), nullable=False),
        sa.Column('total_candidates', sa.Integer(), nullable=True),
        sa.Column('archived_count', sa.Integer(), nullable=True),
        sa.Column('skipped_count', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_archive_jobs_table_name', 'archive_jobs', ['table_name'])
    op.create_table('archived_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=False),
        sa.Column('table_name', sa.String(length=100), nullable=False),
        sa.Column('record_id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=True),
        sa.Column('data', sa.JSON(), nullable=False),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['archive_jobs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_archived_records_job_id', 'archived_records', ['job_id'])
    op.create_index('ix_archived_records_table_name', 'archived_records', ['table_name'])
    op.create_index('ix_archived_records_record_id', 'archived_records', ['record_id'])
    op.create_index('ix_archived_records_school_id', 'archived_records', ['school_id'])
    op.create_index('ix_archived_records_archived_at', 'archived_records', ['archived_at'])


def downgrade() -> None:
    op.drop_table('archived_records')
    op.drop_table('archive_jobs')
