"""merge_password_recovery_and_indexes

Revision ID: fe06878765f8
Revises: 6d478aefeea0, f7e8d9c0a1b2
Create Date: 2026-07-16 19:54:12.563062

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fe06878765f8'
down_revision = ('6d478aefeea0', 'f7e8d9c0a1b2')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
