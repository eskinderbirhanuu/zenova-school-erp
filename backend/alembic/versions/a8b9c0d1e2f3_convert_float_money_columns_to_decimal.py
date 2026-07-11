"""convert Float money columns to DECIMAL(15,2)

Revision ID: a8b9c0d1e2f3
Revises: c5d6e7f8a0b1
Create Date: 2026-07-10 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a8b9c0d1e2f3'
down_revision = 'c5d6e7f8a0b1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("library_fines", "amount",
                    type_=sa.DECIMAL(15, 2),
                    postgresql_using="amount::numeric(15,2)")
    op.alter_column("inventory_assets", "value",
                    type_=sa.DECIMAL(15, 2),
                    postgresql_using="value::numeric(15,2)")


def downgrade() -> None:
    op.alter_column("library_fines", "amount",
                    type_=sa.FLOAT(),
                    postgresql_using="amount::double precision")
    op.alter_column("inventory_assets", "value",
                    type_=sa.FLOAT(),
                    postgresql_using="value::double precision")
