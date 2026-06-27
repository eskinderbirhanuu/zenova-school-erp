from datetime import datetime
from sqlalchemy.orm import Session
from app.models.number_sequence import NumberSequence


PREFIX_MAP = {
    "student": "STU",
    "teacher": "TCH",
    "staff": "STF",
    "parent": "PAR",
}


def generate_id(db: Session, entity_type: str, school_id: str) -> str:
    """Generate auto-incrementing ID: {PREFIX}-{YEAR}-{SEQUENCE:05d}"""
    prefix = PREFIX_MAP.get(entity_type)
    if not prefix:
        raise ValueError(f"Unknown entity type: {entity_type}")

    year = datetime.utcnow().year

    seq = db.query(NumberSequence).filter(
        NumberSequence.prefix == prefix,
        NumberSequence.school_id == school_id,
        NumberSequence.year == year,
    ).with_for_update().first()

    if not seq:
        seq = NumberSequence(
            prefix=prefix,
            school_id=school_id,
            year=year,
            last_number=0,
        )
        db.add(seq)
        db.flush()

    seq.last_number += 1
    db.flush()

    formatted_id = f"{prefix}-{year}-{seq.last_number:05d}"
    return formatted_id
