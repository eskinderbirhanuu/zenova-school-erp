"""add server identity table + license key columns

Revision ID: b8c9d0e1f2a3b4c5
Revises: a7b9c1d2e3f4a5b6
Create Date: 2026-06-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b8c9d0e1f2a3b4c5'
down_revision = 'a7b9c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('server_identities',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('server_id', sa.String(64), unique=True, nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=True),
        sa.Column('branch_id', sa.String(36), sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('parent_server_id', sa.String(64), nullable=True),
        sa.Column('fingerprint_sha256', sa.String(128), unique=True, nullable=False),
        sa.Column('server_role', sa.Enum('SUPER_ADMIN', 'MAIN_SCHOOL', 'BRANCH', name='serverrole'), nullable=False),
        sa.Column('vps_url', sa.String(500), nullable=True),
        sa.Column('is_trusted', sa.Boolean(), default=False),
        sa.Column('sync_enabled', sa.Boolean(), default=False),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('registered_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_server_identities_server_id', 'server_identities', ['server_id'])
    op.create_index('ix_server_identities_fingerprint', 'server_identities', ['fingerprint_sha256'])

    op.add_column('schools', sa.Column('main_license_key', sa.String(255), nullable=True))
    op.add_column('branches', sa.Column('branch_license_key', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('branches', 'branch_license_key')
    op.drop_column('schools', 'main_license_key')
    op.drop_index('ix_server_identities_fingerprint', table_name='server_identities')
    op.drop_index('ix_server_identities_server_id', table_name='server_identities')
    op.drop_table('server_identities')
    sa.Enum(name='serverrole').drop(op.get_bind(), checkfirst=False)
