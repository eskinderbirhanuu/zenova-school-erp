"""fix: retry_count, priority, sign_count String->Integer

Revision ID: 9663cee3ff8a
Revises: a1b2c3d4e5f6a7b8
Create Date: 2026-07-28 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '9663cee3ff8a'
down_revision = 'a1b2c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return name in insp.get_table_names()


def upgrade() -> None:
    op.alter_column('sync_queue', 'retry_count',
                    existing_type=sa.VARCHAR(length=10),
                    type_=sa.Integer(),
                    existing_nullable=True,
                    postgresql_using='retry_count::integer')
    op.execute("ALTER TABLE sync_queue ALTER COLUMN priority DROP DEFAULT")
    op.alter_column('sync_queue', 'priority',
                    existing_type=sa.VARCHAR(length=10),
                    type_=sa.Integer(),
                    existing_nullable=True,
                    postgresql_using='priority::integer')
    op.execute("ALTER TABLE sync_queue ALTER COLUMN priority SET DEFAULT 5")

    if not _table_exists('webauthn_credentials'):
        op.create_table(
            'webauthn_credentials',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('credential_id', sa.String(length=500), nullable=False),
            sa.Column('public_key_cbor', sa.Text(), nullable=False),
            sa.Column('sign_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('device_name', sa.String(length=255), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),
            sa.Column('deleted_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_webauthn_credentials_user_id', 'webauthn_credentials', ['user_id'])
        op.create_unique_constraint('uq_webauthn_credentials_credential_id',
                                    'webauthn_credentials', ['credential_id'])
    else:
        op.execute("ALTER TABLE webauthn_credentials ALTER COLUMN sign_count DROP DEFAULT")
        op.alter_column('webauthn_credentials', 'sign_count',
                        existing_type=sa.VARCHAR(length=20),
                        type_=sa.Integer(),
                        existing_nullable=False,
                        postgresql_using='sign_count::integer')
        op.execute("ALTER TABLE webauthn_credentials ALTER COLUMN sign_count SET DEFAULT 0")


def downgrade() -> None:
    op.alter_column('sync_queue', 'retry_count',
                    existing_type=sa.Integer(),
                    type_=sa.VARCHAR(length=10),
                    existing_nullable=True)
    op.alter_column('sync_queue', 'priority',
                    existing_type=sa.Integer(),
                    type_=sa.VARCHAR(length=10),
                    existing_nullable=True,
                    existing_server_default=sa.text("'5'::character varying"))
    if _table_exists('webauthn_credentials'):
        op.alter_column('webauthn_credentials', 'sign_count',
                        existing_type=sa.Integer(),
                        type_=sa.VARCHAR(length=20),
                        existing_nullable=False,
                        existing_server_default=sa.text("'0'::character varying"))
