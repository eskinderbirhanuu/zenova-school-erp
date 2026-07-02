"""add idempotency_key to payments

Revision ID: cf5da0e968b4
Revises: ed34b3133cb4
Create Date: 2026-06-27 14:06:54.650377

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cf5da0e968b4'
down_revision = 'ed34b3133cb4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("idempotency_key", sa.String(255), nullable=True))
    op.create_unique_constraint("uq_payments_idempotency_key", "payments", ["idempotency_key"])


def downgrade() -> None:
    op.drop_constraint("uq_payments_idempotency_key", "payments", type_="unique")
    op.drop_column("payments", "idempotency_key")
