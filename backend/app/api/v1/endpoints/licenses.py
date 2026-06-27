from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.license import (
    LicenseVerifyRequest,
    LicenseVerifyResponse,
    LicenseActivateRequest,
    LicenseActivateResponse,
    LicenseCreateRequest,
    LicenseStatusUpdate,
    LicenseResponse,
    LicenseListResponse,
    LicenseStatusResponse,
)
from app.services import license_service
from app.api.v1.deps import get_current_user
from app.core.permissions import PermissionChecker, RolePermission
from app.models.user import User
from app.models.license import License

router = APIRouter(tags=["licenses"])


@router.post("/licenses/verify", response_model=LicenseVerifyResponse)
def verify_license(data: LicenseVerifyRequest, db: Session = Depends(get_db)):
    """Verify a license key (no auth required - used before login)"""
    result = license_service.verify_license(db, data.key)
    return LicenseVerifyResponse(
        valid=result["valid"],
        license_type=result.get("license_type"),
        message=result["message"],
    )


@router.post("/licenses/activate", response_model=LicenseActivateResponse)
def activate_license(
    data: LicenseActivateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.LICENSE_MANAGE)),
):
    """Activate a license for a school (SUPER_ADMIN only)"""
    result = license_service.activate_license(db, data.key, data.school_id)
    return LicenseActivateResponse(
        activated=result["activated"],
        message=result["message"],
    )


@router.get("/licenses", response_model=LicenseListResponse)
def list_licenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.LICENSE_MANAGE)),
):
    """List all licenses (SUPER_ADMIN only)"""
    licenses = db.query(License).order_by(License.created_at.desc()).all()
    return LicenseListResponse(
        licenses=[LicenseResponse.model_validate(l) for l in licenses],
        total=len(licenses),
    )


@router.get("/licenses/{license_id}", response_model=LicenseResponse)
def get_license(
    license_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.LICENSE_MANAGE)),
):
    """Get license details"""
    license_record = db.query(License).filter(License.id == license_id).first()
    if not license_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    return LicenseResponse.model_validate(license_record)


@router.post("/licenses", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_license(
    data: LicenseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.LICENSE_MANAGE)),
):
    """Create a new license (SUPER_ADMIN only)"""
    try:
        license_record = license_service.create_license(
            db,
            key=data.key,
            license_type=data.license_type,
            valid_from=data.valid_from,
            valid_until=data.valid_until,
            max_users=data.max_users,
        )
        return LicenseResponse.model_validate(license_record)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.patch("/licenses/{license_id}/status", response_model=LicenseResponse)
def update_license_status(
    license_id: str,
    data: LicenseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.LICENSE_MANAGE)),
):
    """Update license status (SUPER_ADMIN only)"""
    license_record = license_service.update_license_status(db, license_id, data.status)
    if not license_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    return LicenseResponse.model_validate(license_record)


@router.get("/licenses/status/current", response_model=LicenseStatusResponse)
def get_license_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current license status for the user's school"""
    school_id = current_user.school_id
    license_record = license_service.get_license_status(db, school_id)
    if not license_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No license found")

    days_remaining = None
    is_expired = False
    if license_record.valid_until:
        remaining = (license_record.valid_until - datetime.utcnow()).days
        days_remaining = max(0, remaining)
        is_expired = remaining <= 0

    return LicenseStatusResponse(
        key=license_record.key,
        license_type=license_record.license_type.value,
        status=license_record.status.value,
        valid_from=license_record.valid_from,
        valid_until=license_record.valid_until,
        max_users=license_record.max_users,
        days_remaining=days_remaining,
        is_expired=is_expired,
    )
