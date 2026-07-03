"""License management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    LicenseVerifyRequest, LicenseVerifyResponse,
    LicenseActivateRequest, LicenseActivateResponse,
    LicenseKeyGenerate,
)
from app.services.license_service import (
    create_license, verify_license, activate_license, list_school_licenses,
)

router = APIRouter()


@router.get("/ping")
def ping():
    return {"status": "ok"}


@router.post("/verify", response_model=LicenseVerifyResponse)
def verify(data: LicenseVerifyRequest, db: Session = Depends(get_db)):
    result = verify_license(db, data.key, data.machine_fingerprint)
    return LicenseVerifyResponse(
        valid=result["valid"],
        license_type=result.get("license_type"),
        status=result.get("status"),
        valid_until=result.get("valid_until"),
        max_users=result.get("max_users"),
        message=result["message"],
    )


@router.post("/activate", response_model=LicenseActivateResponse)
def activate(data: LicenseActivateRequest, db: Session = Depends(get_db)):
    result = activate_license(db, data.key, data.machine_fingerprint)
    return LicenseActivateResponse(
        activated=result["activated"],
        message=result["message"],
    )


@router.post("/generate")
def generate(data: LicenseKeyGenerate, db: Session = Depends(get_db)):
    lic = create_license(
        db, data.school_id, data.license_type,
        data.valid_until, data.max_users, data.max_branches,
    )
    return {"key": lic.key, "id": lic.id, "license_type": lic.license_type}


@router.get("/school/{school_id}")
def get_school_licenses(school_id: str, db: Session = Depends(get_db)):
    licenses = list_school_licenses(db, school_id)
    return {
        "school_id": school_id,
        "licenses": [l.to_dict() for l in licenses],
        "total": len(licenses),
    }
