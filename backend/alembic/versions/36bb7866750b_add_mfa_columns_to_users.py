"""add_mfa_columns_to_users

Revision ID: 36bb7866750b
Revises: 9663cee3ff8a
Create Date: 2026-08-08 12:04:05.917425

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '36bb7866750b'
down_revision = '9663cee3ff8a'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    if table not in insp.get_table_names():
        return False
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    if _column_exists("users", "mfa_enabled"):
        return
    op.add_column("users", sa.Column("mfa_enabled", sa.Boolean(), nullable=True, server_default=sa.text("false")))
    op.add_column("users", sa.Column("mfa_secret", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("mfa_backup_codes", sa.Text(), nullable=True))


def downgrade() -> None:
    if _column_exists("users", "mfa_backup_codes"):
        op.drop_column("users", "mfa_backup_codes")
    if _column_exists("users", "mfa_secret"):
        op.drop_column("users", "mfa_secret")
    if _column_exists("users", "mfa_enabled"):
        op.drop_column("users", "mfa_enabled")
