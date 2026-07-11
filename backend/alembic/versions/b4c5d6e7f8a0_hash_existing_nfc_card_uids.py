"""hash existing NFC card UIDs with SHA-256 + secret salt

Revision ID: b4c5d6e7f8a0
Revises: a3b4c5d6e7f8
Create Date: 2026-07-07 05:00:00.000000

"""
import hashlib
from alembic import op
from sqlalchemy import text


revision = 'b4c5d6e7f8a0'
down_revision = 'a3b4c5d6e7f8'
branch_labels = None
depends_on = None

# These tables have a card_uid column storing raw NFC UIDs.
# We hash them with SHA-256(card_uid || ':' || secret_key) where
# secret_key is the app's SECRET_KEY at the time of migration.
TABLES = [
    "student_cards",
    "staff_cards",
    "parent_cards",
    "employee_cards",
    "nfc_cards",
    "nfc_scan_logs",
]


def upgrade() -> None:
    # Read SECRET_KEY from environment
    import os
    secret = os.environ.get("SECRET_KEY", "")
    if not secret:
        print("WARNING: SECRET_KEY not set — hashing will not match runtime values!")
        secret = "migration-fallback-key-change-me"

    for table in TABLES:
        conn = op.get_bind()
        rows = conn.execute(text(f"SELECT id, card_uid FROM {table} WHERE card_uid IS NOT NULL")).fetchall()
        for row_id, raw_uid in rows:
            hashed = hashlib.sha256(f"{raw_uid}:{secret}".encode()).hexdigest()
            conn.execute(
                text(f"UPDATE {table} SET card_uid = :hash WHERE id = :id"),
                {"hash": hashed, "id": row_id},
            )
        print(f"Hashed {len(rows)} UIDs in {table}")


def downgrade() -> None:
    # Downgrade is not possible — we cannot recover the original plaintext UIDs.
    pass
