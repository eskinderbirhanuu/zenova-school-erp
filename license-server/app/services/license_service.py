"""License key generation and verification (cloud side)."""
import uuid
import hashlib
import json
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import SchoolLicense, LicenseStatus
from app.core.config import settings


def generate_license_key(school_id: str, license_type: str = "main") -> str:
    """Generate a deterministic license key.
    Format: ZNV-{TYPE}-{BASE58_HASH}-{CRC32}
    """
    raw = f"{school_id}:{license_type}:{uuid.uuid4().hex}:{datetime.now(timezone.utc).isoformat()}"
    hash_part = hashlib.sha256(raw.encode()).hexdigest()[:16].upper()
    crc = zlib_crc32(hash_part)
    type_code = license_type[0].upper() if license_type else "M"
    return f"ZNV-{type_code}-{hash_part}-{crc}"


def zlib_crc32(data: str) -> str:
    import zlib
    return format(zlib.crc32(data.encode()) & 0xFFFFFFFF, "08X")


def create_license(db: Session, school_id: str, license_type: str = "main",
                   valid_until: Optional[str] = None,
                   max_users: int = 100, max_branches: int = 1) -> SchoolLicense:
    key = generate_license_key(school_id, license_type)
    until = None
    if valid_until:
        try:
            until = datetime.fromisoformat(valid_until)
        except (ValueError, TypeError):
            until = datetime.now(timezone.utc) + timedelta(days=365)
    else:
        until = datetime.now(timezone.utc) + timedelta(days=365)

    lic = SchoolLicense(
        school_id=school_id,
        key=key,
        license_type=license_type,
        status=LicenseStatus.ACTIVE.value,
        valid_from=datetime.now(timezone.utc),
        valid_until=until,
        max_users=max_users,
        max_branches=max_branches,
    )
    db.add(lic)
    db.commit()
    db.refresh(lic)
    return lic


def verify_license(db: Session, key: str, machine_fingerprint: Optional[str] = None) -> dict:
    lic = db.query(SchoolLicense).filter(SchoolLicense.key == key).first()
    if not lic:
        return {"valid": False, "message": "License key not found"}

    if lic.status == LicenseStatus.SUSPENDED.value:
        return {"valid": False, "message": "License has been suspended"}

    if lic.status == LicenseStatus.REVOKED.value:
        return {"valid": False, "message": "License has been revoked"}

    if lic.status == LicenseStatus.EXPIRED.value:
        return {"valid": False, "message": "License has expired"}

    if lic.valid_until and lic.valid_until < datetime.now(timezone.utc):
        lic.status = LicenseStatus.EXPIRED.value
        db.commit()
        return {"valid": False, "message": "License has expired"}

    # Update last verified timestamp
    lic.last_verified_at = datetime.now(timezone.utc)
    if machine_fingerprint:
        if lic.machine_fingerprint and lic.machine_fingerprint != machine_fingerprint:
            return {"valid": False, "message": "Hardware fingerprint mismatch"}
        lic.machine_fingerprint = machine_fingerprint
    db.commit()

    return {
        "valid": True,
        "license_type": lic.license_type,
        "status": lic.status,
        "valid_until": lic.valid_until.isoformat() if lic.valid_until else None,
        "max_users": lic.max_users,
        "message": "License is valid",
    }


def activate_license(db: Session, key: str, machine_fingerprint: str) -> dict:
    lic = db.query(SchoolLicense).filter(SchoolLicense.key == key).first()
    if not lic:
        return {"activated": False, "message": "License key not found"}

    if lic.machine_fingerprint and lic.machine_fingerprint != machine_fingerprint:
        return {"activated": False, "message": "Already bound to different hardware"}

    lic.machine_fingerprint = machine_fingerprint
    lic.last_verified_at = datetime.now(timezone.utc)
    db.commit()
    return {"activated": True, "message": "License activated successfully"}


def list_school_licenses(db: Session, school_id: str) -> list:
    return db.query(SchoolLicense).filter(
        SchoolLicense.school_id == school_id
    ).order_by(SchoolLicense.created_at.desc()).all()
