"""add_missing_schema_fixes

Revision ID: 9a4b5c6d7e8f
Revises: 3f5a9c1d2e4b
Create Date: 2026-08-09 11:00:00.000000

Closes schema drift between the SQLAlchemy models and the migrated DB:

Missing tables:
  - currencies
  - device_fingerprints
  - teacher_subjects

Missing columns:
  - invoices.currency_code
  - notification_preferences.deleted_at
  - number_sequences.created_at
  - payments.currency_code
  - school_settings.deleted_at
  - school_telegram_bots.deleted_at
  - server_identities.deleted_at
  - sync_queue.deleted_at
  - teacher_section_assignments.created_at
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a4b5c6d7e8f'
down_revision = '3f5a9c1d2e4b'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    if table not in insp.get_table_names():
        return False
    return column in {c["name"] for c in insp.get_columns(table)}


def _table_exists(table: str) -> bool:
    return table in sa.inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    # --- missing columns ---
    if not _column_exists("invoices", "currency_code"):
        op.add_column("invoices", sa.Column("currency_code", sa.String(length=3), nullable=False, server_default="ETB"))
    if not _column_exists("payments", "currency_code"):
        op.add_column("payments", sa.Column("currency_code", sa.String(length=3), nullable=False, server_default="ETB"))
    if not _column_exists("notification_preferences", "deleted_at"):
        op.add_column("notification_preferences", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    if not _column_exists("number_sequences", "created_at"):
        op.add_column("number_sequences", sa.Column("created_at", sa.DateTime(), nullable=True))
    if not _column_exists("school_settings", "deleted_at"):
        op.add_column("school_settings", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    if not _column_exists("school_telegram_bots", "deleted_at"):
        op.add_column("school_telegram_bots", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    if not _column_exists("server_identities", "deleted_at"):
        op.add_column("server_identities", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    if not _column_exists("sync_queue", "deleted_at"):
        op.add_column("sync_queue", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    if not _column_exists("teacher_section_assignments", "created_at"):
        op.add_column("teacher_section_assignments", sa.Column("created_at", sa.DateTime(), nullable=True))

    # --- missing tables ---
    if not _table_exists("currencies"):
        op.create_table(
            "currencies",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("code", sa.String(length=3), unique=True, nullable=False, index=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("symbol", sa.String(length=10), nullable=False),
            sa.Column("exchange_rate_to_etb", sa.DECIMAL(precision=15, scale=6), nullable=False, server_default="1.0"),
            sa.Column("is_base", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
        )
    if not _table_exists("device_fingerprints"):
        op.create_table(
            "device_fingerprints",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False, index=True),
            sa.Column("fingerprint_hash", sa.String(length=64), nullable=False, index=True),
            sa.Column("device_label", sa.String(length=255), nullable=True),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("user_agent", sa.String(length=500), nullable=True),
            sa.Column("is_trusted", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("first_seen_at", sa.DateTime(), nullable=True),
            sa.Column("last_seen_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
        )
    if not _table_exists("teacher_subjects"):
        op.create_table(
            "teacher_subjects",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("teacher_profile_id", sa.String(length=36), sa.ForeignKey("teacher_profiles.id"), nullable=False, index=True),
            sa.Column("subject_id", sa.String(length=36), sa.ForeignKey("subjects.id"), nullable=False),
            sa.Column("school_id", sa.String(length=36), sa.ForeignKey("schools.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("teacher_profile_id", "subject_id", name="uq_teacher_subject"),
        )


def downgrade() -> None:
    if _table_exists("teacher_subjects"):
        op.drop_table("teacher_subjects")
    if _table_exists("device_fingerprints"):
        op.drop_table("device_fingerprints")
    if _table_exists("currencies"):
        op.drop_table("currencies")
    for table, column in (
        ("teacher_section_assignments", "created_at"),
        ("sync_queue", "deleted_at"),
        ("server_identities", "deleted_at"),
        ("school_telegram_bots", "deleted_at"),
        ("school_settings", "deleted_at"),
        ("number_sequences", "created_at"),
        ("notification_preferences", "deleted_at"),
        ("payments", "currency_code"),
        ("invoices", "currency_code"),
    ):
        if _column_exists(table, column):
            op.drop_column(table, column)
