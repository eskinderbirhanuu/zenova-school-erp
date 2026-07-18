from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.number_sequence import NumberSequence


def next_sequence_number(db: Session, prefix: str, school_id: str, year: Optional[int] = None) -> str:
    """Race-free document-number generator using the locked NumberSequence table.

    Atomically reserves the next sequence value by locking the per-(prefix, school, year) row.
    Retries up to 3 times on first-insert race conditions.
    """
    if year is None:
        year = datetime.now(timezone.utc).year

    for attempt in range(3):
        seq = db.query(NumberSequence).filter(
            NumberSequence.prefix == prefix,
            NumberSequence.school_id == school_id,
            NumberSequence.year == year,
        ).with_for_update().first()

        if seq is None:
            seq = NumberSequence(prefix=prefix, school_id=school_id, year=year, last_number=0)
            db.add(seq)
            try:
                db.flush()
                seq = db.query(NumberSequence).filter(
                    NumberSequence.prefix == prefix,
                    NumberSequence.school_id == school_id,
                    NumberSequence.year == year,
                ).with_for_update().first()
            except IntegrityError:
                db.rollback()
                continue

        try:
            seq.last_number += 1
            db.flush()
        except IntegrityError:
            db.rollback()
            seq = None
            continue

        return f"{prefix}-{year}-{seq.last_number:05d}"

    raise RuntimeError(f"Could not generate sequence number for {prefix}/{school_id}/{year} after 3 attempts")
