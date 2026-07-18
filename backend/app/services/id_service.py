from sqlalchemy.orm import Session
from app.utils.sequence import next_sequence_number


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
    """Generate auto-incrementing ID: {PREFIX}-{YEAR}-{SEQUENCE:05d}"""
    prefix = PREFIX_MAP.get(entity_type)
    if not prefix:
        raise ValueError(f"Unknown entity type: {entity_type}")
    return next_sequence_number(db, prefix, school_id)
