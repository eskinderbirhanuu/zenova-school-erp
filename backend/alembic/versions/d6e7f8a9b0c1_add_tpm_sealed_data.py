"""add tpm_sealed_data column to licenses for TPM-based key sealing

Revision ID: d6e7f8a9b0c1
Revises: d5e6f7a8b9c0
Create Date: 2026-07-05 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d6e7f8a9b0c1"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("licenses", sa.Column("tpm_sealed_data", sa.String(512), nullable=True,
                                        comment="TPM-sealed machine fingerprint for enhanced binding"))


def downgrade() -> None:
    op.drop_column("licenses", "tpm_sealed_data")
