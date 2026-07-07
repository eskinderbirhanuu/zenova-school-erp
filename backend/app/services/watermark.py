import os
import json
import base64
from typing import Optional

from app.models.student import Student
from app.models.parent import Parent
from app.models.school import School

_WATERMARK_OVERRIDE: Optional[str] = None


def set_school_watermark(school_id: str, school_name: str = "") -> None:
    """Set the watermark for a school. Called during activation."""
    global _WATERMARK_OVERRIDE
    short_id = school_id[:8] if school_id else "unknown"
    name_part = school_name[:4].replace(" ", "_").upper() if school_name else "SCHOOL"
    _WATERMARK_OVERRIDE = f"{name_part}_{short_id}"


def get_watermark() -> str:
    return _WATERMARK_OVERRIDE or os.environ.get("SCHOOL_WATERMARK", "dev")


def encrypt_watermark(school_id: str) -> str:
    """Simple XOR-based watermark encryption for response headers."""
    key = SCHOOL_WATERMARK.encode()
    data = school_id.encode()
    encrypted = bytes([d ^ key[i % len(key)] for i, d in enumerate(data)])
    return base64.b64encode(encrypted).decode()


def decrypt_watermark(encoded: str) -> Optional[str]:
    try:
        key = SCHOOL_WATERMARK.encode()
        encrypted = base64.b64decode(encoded)
        decrypted = bytes([e ^ key[i % len(key)] for i, e in enumerate(encrypted)])
        return decrypted.decode()
    except Exception:
        return None


# ─── Honeytoken Registry ────────────────────────────────
# Each school gets unique honeytoken records in seed data.
# These look like real data but are unique per school.
# If a cracked version is found, search for these strings
# to identify which school leaked it.

HONEYTOKEN_REGISTRY: dict[str, dict[str, str]] = {}


def register_school_honeytokens(school_id: str, watermark: str):
    """Register honeytoken data for a school."""
    HONEYTOKEN_REGISTRY[school_id] = {
        "watermark": watermark,
        "honeytoken_student": f"Honeytoken Student [{watermark}]",
        "honeytoken_mother": f"Honeytoken Mother [{watermark}]",
        "honeytoken_parent": f"Honeytoken Parent [{watermark}]",
        "honeytoken_invoice": f"INV-HT-{watermark}-99999",
        "honeytoken_book_isbn": f"978-0-{hash(watermark) % 100000:05d}-{hash(watermark[::-1]) % 1000:03d}-0",
    }


def get_honeytokens_for_school(school_id: str) -> dict:
    """Get honeytoken records for a school."""
    return HONEYTOKEN_REGISTRY.get(school_id, {})


def identify_school_from_honeytoken(token: str) -> Optional[str]:
    """Reverse lookup: find school_id from a honeytoken value."""
    for school_id, tokens in HONEYTOKEN_REGISTRY.items():
        if token in tokens.values():
            return school_id
    return None


def watermark_seed_data(db_session, school_id: str):
    """Insert honeytoken records into seed data for a school."""
    from app.database import SessionLocal
    from app.models.student import Student
    import uuid
    from datetime import date

    wm = get_watermark()
    register_school_honeytokens(school_id, wm)
    tokens = get_honeytokens_for_school(school_id)

    # Honeytoken student (not visible in normal UI)
    honeytoken_first = tokens["honeytoken_student"]
    existing = db_session.query(Student).filter(
        Student.first_name == honeytoken_first
    ).first()
    if not existing:
        student = Student(
            id=str(uuid.uuid4()),
            first_name=honeytoken_first,
            middle_name="",
            last_name="Honeytoken",
            student_id=f"HT-{school_id[:8]}-{uuid.uuid4().hex[:6].upper()}",
            gender="Other",
            date_of_birth=date(2000, 1, 1),
            admission_date=date(2025, 1, 1),
            school_id=school_id,
            status="active",
        )
        db_session.add(student)

    # Honeytoken parent
    existing_parent = db_session.query(Parent).filter(
        Parent.full_name == tokens["honeytoken_parent"]
    ).first()
    if not existing_parent:
        parent = Parent(
            id=str(uuid.uuid4()),
            full_name=tokens["honeytoken_parent"],
            phone_1=f"+251911{wm[:4]}",
            phone_2=f"+251922{wm[4:8]}",
            relationship="guardian",
            school_id=school_id,
        )
        db_session.add(parent)

    db_session.commit()
