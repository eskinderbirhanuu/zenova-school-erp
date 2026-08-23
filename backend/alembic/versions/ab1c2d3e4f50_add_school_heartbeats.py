"""add school_heartbeats table for org-side remote fleet visibility

Revision ID: ab1c2d3e4f50
Revises: e5f6a7b8c9d0
Create Date: 2026-08-20 12:00:00.000000

Org-side persistence of every heartbeat received from school servers —
powers the Schools Overview (online/offline, version, last-seen) and the
remote-control directives (suspend/force_verify) returned to schools.
"""
from alembic import op
import sqlalchemy as sa

revision = 'ab1c2d3e4f50'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'school_heartbeats',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('server_id', sa.String(length=64), nullable=False),
        sa.Column('school_code', sa.String(length=64), nullable=False),
        sa.Column('server_role', sa.String(length=32), nullable=True),
        sa.Column('version', sa.String(length=64), nullable=True),
        sa.Column('license_key', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('received_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_school_heartbeats_server_id', 'school_heartbeats', ['server_id'])
    op.create_index('ix_school_heartbeats_school_code', 'school_heartbeats', ['school_code'])
    op.create_index('ix_school_heartbeats_license_key', 'school_heartbeats', ['license_key'])
    op.create_index('ix_school_heartbeats_received_at', 'school_heartbeats', ['received_at'])
    op.create_index('ix_school_heartbeats_code_time', 'school_heartbeats', ['school_code', 'received_at'])


def downgrade() -> None:
    op.drop_index('ix_school_heartbeats_code_time', table_name='school_heartbeats')
    op.drop_index('ix_school_heartbeats_received_at', table_name='school_heartbeats')
    op.drop_index('ix_school_heartbeats_license_key', table_name='school_heartbeats')
    op.drop_index('ix_school_heartbeats_school_code', table_name='school_heartbeats')
    op.drop_index('ix_school_heartbeats_server_id', table_name='school_heartbeats')
    op.drop_table('school_heartbeats')