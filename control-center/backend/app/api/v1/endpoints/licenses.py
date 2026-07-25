import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.license import License
from app.schemas.license import LicenseCreate, LicenseResponse, LicenseValidateRequest, LicenseValidateResponse

router = APIRouter()

def generate_license_key() -> str:
    raw = uuid.uuid4().hex.upper()[:24]
    return "-".join(raw[i:i+6] for i in range(0, 24, 6))

@router.get("", response_model=list[LicenseResponse])
def list_licenses(customer_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(License)
    if customer_id:
        query = query.filter(License.customer_id == customer_id)
    return query.order_by(License.created_at.desc()).all()

@router.post("", response_model=LicenseResponse)
def create_license(data: LicenseCreate, db: Session = Depends(get_db)):
    license_key = generate_license_key()
    lic = License(
        customer_id=data.customer_id,
        license_key=license_key,
        plan=data.plan,
        seats=data.seats,
        expires_at=datetime.fromisoformat(data.expires_at),
        notes=data.notes,
    )
    db.add(lic)
    db.commit()
    db.refresh(lic)
    return lic

@router.get("/{license_id}", response_model=LicenseResponse)
def get_license(license_id: int, db: Session = Depends(get_db)):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    return lic

@router.post("/validate", response_model=LicenseValidateResponse)
def validate_license(req: LicenseValidateRequest, db: Session = Depends(get_db)):
    lic = db.query(License).filter(License.license_key == req.license_key).first()
    if not lic:
        return LicenseValidateResponse(valid=False, message="License key not found")
    if not lic.is_active:
        return LicenseValidateResponse(valid=False, message="License is deactivated")
    if datetime.now() > lic.expires_at:
        return LicenseValidateResponse(valid=False, message="License has expired")
    lic.last_validated = datetime.now()
    db.commit()
    return LicenseValidateResponse(
        valid=True,
        plan=lic.plan,
        seats=lic.seats,
        expires_at=lic.expires_at.isoformat(),
    )

@router.post("/{license_id}/deactivate")
def deactivate_license(license_id: int, db: Session = Depends(get_db)):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    lic.is_active = False
    db.commit()
    return {"ok": True}
