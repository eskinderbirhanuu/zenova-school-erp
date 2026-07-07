"""add_card_designs_table

Revision ID: 824e09b38d35
Revises: 8ce8f15441b9
Create Date: 2026-07-06 08:31:47.061090

"""
from alembic import op
import sqlalchemy as sa


revision = '824e09b38d35'
down_revision = '8ce8f15441b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('card_designs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('design_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_card_designs_school_id'), 'card_designs', ['school_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_card_designs_school_id'), table_name='card_designs')
    op.drop_table('card_designs')
