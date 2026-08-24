import secrets
import hashlib
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import verify_token
from app.database import get_db
from app.models.license import License, LicenseType, LicenseStatus
from app.schemas.license import (
    LicenseCreate,
    LicenseResponse,
    LicenseListResponse,
    LicenseValidateRequest,
    LicenseValidateResponse,
    LicenseKeyGenerateRequest,
    LicenseKeyGenerateResponse,
    LicenseUpdate,
)

router = APIRouter()


def generate_secure_license_key() -> str:
    """Generate a cryptographically secure license key.
    
    Format: ZNV-{type}-{random_base58}-{checksum}
    Example: ZNV-M-7xK9mP2qR5wX-8F3A
    
    Uses cryptographically secure random bytes encoded in base58
    with a CRC32 checksum for validation.
    """
    # Base58 alphabet (excludes similar-looking characters)
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    
    # Generate 24 bytes of cryptographically secure random data
    random_bytes = secrets.token_bytes(24)
    
    # Encode to base58
    n = int.from_bytes(random_bytes, "big")
    chars = []
    while n > 0:
        n, r = divmod(n, 58)
        chars.append(alphabet[r])
    base58 = "".join(reversed(chars))
    
    # Pad to ensure consistent length
    base58 = base58.rjust(34, "1")
    
    # Generate CRC32 checksum (4 chars)
    checksum_data = f"ZNV-{base58}".encode()
    crc = hashlib.md5(checksum_data).hexdigest()[:4].upper()
    
    return f"ZNV-{base58[:24]}-{crc}"


def verify_license_key_format(license_key: str) -> bool:
    """Verify license key format."""
    import re
    # Format: ZNV-{24 chars}-{4 char checksum}
    pattern = r"^ZNV-[A-Z0-9]{24}-[A-F0-9]{4}$"
    return bool(re.match(pattern, license_key))


@router.get("", response_model=LicenseListResponse)
def list_licenses(customer_id: int | None = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    query = db.query(License)
    if customer_id:
        query = query.filter(License.customer_id == customer_id)
    total = query.count()
    licenses = query.order_by(License.created_at.desc()).offset(skip).limit(limit).all()
    return LicenseListResponse(items=licenses, total=total)


@router.post("", response_model=LicenseResponse, status_code=201)
def create_license(data: LicenseCreate, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    # Generate secure license key
    license_key = generate_secure_license_key()
    
    lic = License(
        customer_id=data.customer_id,
        license_key=license_key,
        license_type=data.license_type,
        plan=data.plan,
        seats=data.seats,
        expires_at=datetime.fromisoformat(data.expires_at.replace("Z", "+00:00")),
        notes=data.notes,
        status=LicenseStatus.PENDING,
    )
    db.add(lic)
    db.commit()
    db.refresh(lic)
    return lic


@router.post("/generate-key", response_model=LicenseResponse, status_code=201)
def generate_license_key_endpoint(data: LicenseKeyGenerateRequest, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    """Generate a license key without immediately creating the license record.
    Useful for pre-generating keys to send to schools."""
    license_key = generate_secure_license_key()
    
    lic = License(
        customer_id=data.customer_id,
        license_key=license_key,
        license_type=data.license_type,
        plan=data.plan,
        seats=data.seats,
        expires_at=datetime.fromisoformat(data.expires_at.replace("Z", "+00:00")),
        notes=data.notes,
        status=LicenseStatus.PENDING,
    )
    db.add(lic)
    db.commit()
    db.refresh(lic)
    return lic


@router.get("", response_model=LicenseListResponse)
def list_licenses(customer_id: int | None = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    query = db.query(License)
    if customer_id:
        query = query.filter(License.customer_id == customer_id)
    total = query.count()
    licenses = query.order_by(License.created_at.desc()).offset(skip).limit(limit).all()
    return LicenseListResponse(items=licenses, total=total)


@router.get("/{license_id}", response_model=LicenseResponse)
def get_license(license_id: int, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    return lic


@router.patch("/{license_id}", response_model=LicenseResponse)
def update_license(license_id: int, data: LicenseUpdate, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    
    update_data = data.model_dump(exclude_unset=True)
    if "expires_at" in update_data and update_data["expires_at"]:
        update_data["expires_at"] = datetime.fromisoformat(update_data["expires_at"].replace("Z", "+00:00"))
    if "status" in update_data and update_data["status"]:
        from app.models.license import LicenseStatus
        update_data["status"] = LicenseStatus(update_data["status"])
    
    for key, val in update_data.items():
        setattr(lic, key, val)
    db.commit()
    db.refresh(lic)
    return lic


@router.post("/validate", response_model=LicenseValidateResponse)
def validate_license(req: LicenseValidateRequest, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    """Validate a license key for a school."""
    if not verify_license_key_format(req.license_key):
        return LicenseValidateResponse(valid=False, message="Invalid license key format")
    
    lic = db.query(License).filter(License.license_key == req.license_key).first()
    if not lic:
        return LicenseValidateResponse(valid=False, message="License key not found")
    
    if lic.customer_id != int(req.school_id):
        return LicenseValidateResponse(valid=False, message="License does not belong to this school")
    
    if not lic.is_active:
        return LicenseValidateResponse(valid=False, message="License is deactivated", status=lic.status.value)
    
    if datetime.now(timezone.utc) > lic.expires_at:
        return LicenseValidateResponse(valid=False, message="License has expired", status=LicenseStatus.EXPIRED.value)
    
    if lic.status == LicenseStatus.REVOKED:
        return LicenseValidateResponse(valid=False, message="License has been revoked", status=LicenseStatus.REVOKED.value)
    
    if lic.status == LicenseStatus.SUSPENDED:
        return LicenseValidateResponse(valid=False, message="License is suspended", status=LicenseStatus.SUSPENDED.value)
    
    # Update last validated timestamp
    lic.last_validated = datetime.now(timezone.utc)
    db.commit()
    
    return LicenseValidateResponse(
        valid=True,
        plan=lic.plan,
        seats=lic.seats,
        expires_at=lic.expires_at.isoformat(),
        license_type=lic.license_type.value,
        status=lic.status.value,
        message="License is valid",
        issued_at=lic.issued_at.isoformat(),
        activated_at=lic.activated_at.isoformat() if lic.activated_at else "",
        revoked_at=lic.revoked_at.isoformat() if lic.revoked_at else "",
        seats_used=0,  # TODO: implement seats tracking
    )


@router.post("/{license_id}/activate", response_model=LicenseResponse)
def activate_license(license_id: int, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    """Activate a license (set status to ACTIVE and set activated_at)."""
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    
    lic.status = LicenseStatus.ACTIVE
    lic.activated_at = datetime.now(timezone.utc)
    lic.is_active = True
    db.commit()
    db.refresh(lic)
    return lic


@router.post("/{license_id}/suspend", response_model=LicenseResponse)
def suspend_license(license_id: int, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    
    lic.status = LicenseStatus.SUSPENDED
    lic.is_active = False
    db.commit()
    db.refresh(lic)
    return lic


@router.post("/{license_id}/revoke", response_model=LicenseResponse)
def revoke_license(license_id: int, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    
    lic.status = LicenseStatus.REVOKED
    lic.is_active = False
    lic.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lic)
    return lic


@router.post("/{license_id}/deactivate")
def deactivate_license(license_id: int, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    """Legacy endpoint - sets is_active to False."""
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    lic.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/validate-public", response_model=LicenseValidateResponse)
def validate_license_public(req: LicenseValidateRequest, db: Session = Depends(get_db)):
    """Public license validation endpoint - no auth required, used by School ERP."""
    if not verify_license_key_format(req.license_key):
        return LicenseValidateResponse(valid=False, message="Invalid license key format")
    
    lic = db.query(License).filter(License.license_key == req.license_key).first()
    if not lic:
        return LicenseValidateResponse(valid=False, message="License key not found")
    
    if lic.customer_id != int(req.school_id):
        return LicenseValidateResponse(valid=False, message="License does not belong to this school")
    
    if not lic.is_active:
        return LicenseValidateResponse(valid=False, message="License is deactivated", status=lic.status.value)
    
    if datetime.now(timezone.utc) > lic.expires_at:
        return LicenseValidateResponse(valid=False, message="License has expired", status=LicenseStatus.EXPIRED.value)
    
    if lic.status == LicenseStatus.REVOKED:
        return LicenseValidateResponse(valid=False, message="License has been revoked", status=LicenseStatus.REVOKED.value)
    
    if lic.status == LicenseStatus.SUSPENDED:
        return LicenseValidateResponse(valid=False, message="License is suspended", status=LicenseStatus.SUSPENDED.value)
    
    # Update last validated timestamp
    lic.last_validated = datetime.now(timezone.utc)
    db.commit()
    
    return LicenseValidateResponse(
        valid=True,
        plan=lic.plan,
        seats=lic.seats,
        expires_at=lic.expires_at.isoformat(),
        license_type=lic.license_type.value,
        status=lic.status.value,
        message="License is valid",
        issued_at=lic.issued_at.isoformat(),
        activated_at=lic.activated_at.isoformat() if lic.activated_at else "",
        revoked_at=lic.revoked_at.isoformat() if lic.revoked_at else "",
        seats_used=0,
    )