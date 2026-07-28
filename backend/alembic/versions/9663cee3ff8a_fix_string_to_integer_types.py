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


def upgrade() -> None:
    op.alter_column('sync_queue', 'retry_count',
                    existing_type=sa.VARCHAR(length=10),
                    type_=sa.Integer(),
                    existing_nullable=True,
                    postgresql_using='retry_count::integer')
    op.alter_column('sync_queue', 'priority',
                    existing_type=sa.VARCHAR(length=10),
                    type_=sa.Integer(),
                    existing_nullable=True,
                    existing_server_default=sa.text("'5'::character varying"),
                    postgresql_using='priority::integer')
    op.alter_column('webauthn_credentials', 'sign_count',
                    existing_type=sa.VARCHAR(length=20),
                    type_=sa.Integer(),
                    existing_nullable=False,
                    existing_server_default=sa.text("'0'::character varying"),
                    postgresql_using='sign_count::integer')


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
    op.alter_column('webauthn_credentials', 'sign_count',
                    existing_type=sa.Integer(),
                    type_=sa.VARCHAR(length=20),
                    existing_nullable=False,
                    existing_server_default=sa.text("'0'::character varying"))