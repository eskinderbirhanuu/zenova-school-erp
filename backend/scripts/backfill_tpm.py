"""CLI script to backfill tpm_sealed_data for existing licenses.

Usage:
    python scripts/backfill_tpm.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.backfill_tpm import backfill_tpm_sealed_data


def main():
    db = SessionLocal()
    try:
        count = backfill_tpm_sealed_data(db)
        print(f"Backfilled {count} licenses")
    finally:
        db.close()


if __name__ == "__main__":
    main()
