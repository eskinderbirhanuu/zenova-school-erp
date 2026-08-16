"""add push_devices table + push_on preference flag

Revision ID: e5f6a7b8c9d0
Revises: 4d6e8f0a2c4e
Create Date: 2026-08-09 18:00:00.000000

Gap N2: FCM/APNs push channel. `push_devices` stores per-user device tokens
for the push relay; `notification_preferences.push_on` gates whether a user
wants push at all.
"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = '4d6e8f0a2c4e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'push_devices',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=True),
        sa.Column('platform', sa.String(length=20), nullable=False),
        sa.Column('token', sa.String(length=512), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_push_devices_user_id', 'push_devices', ['user_id'])
    op.create_index('ix_push_devices_token', 'push_devices', ['token'])
    op.create_index('ix_push_devices_school_id', 'push_devices', ['school_id'])

    with op.batch_alter_table('notification_preferences') as batch_op:
        batch_op.add_column(sa.Column('push_on', sa.Boolean(), server_default=sa.true(), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('notification_preferences') as batch_op:
        batch_op.drop_column('push_on')
    op.drop_index('ix_push_devices_school_id', table_name='push_devices')
    op.drop_index('ix_push_devices_token', table_name='push_devices')
    op.drop_index('ix_push_devices_user_id', table_name='push_devices')
    op.drop_table('push_devices')
