from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.number_sequence import NumberSequence


PREFIX_MAP = {
    "student": "STU",
    "teacher": "TCH",
    "staff": "STF",
    "parent": "PAR",
    "entry": "JE",
    "invoice": "INV",
    "payment": "PAY",
}


def generate_id(db: Session, entity_type: str, school_id: str) -> str:
    """Generate auto-incrementing ID: {PREFIX}-{YEAR}-{SEQUENCE:05d}
    Retries up to 3 times on first-insert race conditions."""
    prefix = PREFIX_MAP.get(entity_type)
    if not prefix:
        raise ValueError(f"Unknown entity type: {entity_type}")

    year = datetime.now(timezone.utc).year

    for attempt in range(3):
        seq = db.query(NumberSequence).filter(
            NumberSequence.prefix == prefix,
            NumberSequence.school_id == school_id,
            NumberSequence.year == year,
        ).with_for_update().first()

        if seq is None:
            seq = NumberSequence(
                prefix=prefix,
                school_id=school_id,
                year=year,
                last_number=0,
            )
            db.add(seq)
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                seq = None
                continue

        try:
            seq.last_number += 1
            db.flush()
        except IntegrityError:
            db.rollback()
            seq = None
            continue

        return f"{prefix}-{year}-{seq.last_number:05d}"

    raise RuntimeError("Could not generate unique ID after 3 attempts")
