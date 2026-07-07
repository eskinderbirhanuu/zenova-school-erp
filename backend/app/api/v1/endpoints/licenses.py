from datetime import datetime, timezone
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
    DeviceChangeRequestResponse,
    DeviceChangeListResponse,
    DeviceChangeReviewRequest,
    DeviceChangeHistoryResponse,
)
from app.services import license_service
from app.services.device_review_service import (
    approve_device_change,
    reject_device_change,
    auto_approve_expired_requests,
)
from app.api.v1.deps import get_current_user, rate_limit
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.license import License, LicenseStatus
from app.models.device_change_request import DeviceChangeRequest

router = APIRouter(tags=["licenses"])

LICENSE_VERIFY_LIMIT = rate_limit("license_verify", 20, 300)


@router.post("/licenses/verify", response_model=LicenseVerifyResponse)
def verify_license(data: LicenseVerifyRequest, db: Session = Depends(get_db), _=Depends(LICENSE_VERIFY_LIMIT)):
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
    current_user: User = require_permission(Permission.LICENSE_MANAGE),
):
    """Activate a license for a school (SUPER_ADMIN only)"""
    result = license_service.activate_license(db, data.key, data.school_id, user_id=current_user.id)
    return LicenseActivateResponse(
        activated=result["activated"],
        message=result["message"],
    )


@router.get("/licenses", response_model=LicenseListResponse)
def list_licenses(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.LICENSE_MANAGE),
):
    """List all licenses (SUPER_ADMIN only)"""
    licenses = db.query(License).execution_options(include_deleted=True).order_by(License.created_at.desc()).all()
    return LicenseListResponse(
        licenses=[LicenseResponse.model_validate(l) for l in licenses],
        total=len(licenses),
    )


@router.get("/licenses/{license_id}", response_model=LicenseResponse)
def get_license(
    license_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.LICENSE_MANAGE),
):
    """Get license details"""
    license_record = db.query(License).filter(License.id == license_id).execution_options(include_deleted=True).first()
    if not license_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    return LicenseResponse.model_validate(license_record)


@router.post("/licenses", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_license(
    data: LicenseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.LICENSE_MANAGE),
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
    current_user: User = require_permission(Permission.LICENSE_MANAGE),
):
    """Update license status (SUPER_ADMIN only)"""
    license_record = license_service.update_license_status(db, license_id, data.status, user_id=current_user.id)
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
        remaining = (license_record.valid_until - datetime.now(timezone.utc)).days
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


# ─── Device Change Review ─────────────────────────────────


@router.get("/licenses/device-changes", response_model=DeviceChangeListResponse)
def list_device_changes(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.DEVICE_REVIEW),
):
    """List device change requests (SUPER_ADMIN / licensed admin only)."""
    query = db.query(DeviceChangeRequest).filter(
        DeviceChangeRequest.deleted_at.is_(None),
    )
    if status_filter:
        query = query.filter(DeviceChangeRequest.status == status_filter)
    requests = query.order_by(DeviceChangeRequest.created_at.desc()).all()
    return DeviceChangeListResponse(
        requests=[DeviceChangeRequestResponse.model_validate(r) for r in requests],
        total=len(requests),
    )


@router.post("/licenses/device-changes/{request_id}/approve", response_model=DeviceChangeRequestResponse)
def approve_device_change_request(
    request_id: str,
    data: DeviceChangeReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.DEVICE_REVIEW),
):
    """Approve a device change request. Rebinds the license to current hardware."""
    result = approve_device_change(db, request_id, current_user.id, data.note)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device change request not found or already processed",
        )
    return DeviceChangeRequestResponse.model_validate(result)


@router.post("/licenses/device-changes/{request_id}/reject", response_model=DeviceChangeRequestResponse)
def reject_device_change_request(
    request_id: str,
    data: DeviceChangeReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.DEVICE_REVIEW),
):
    """Reject a device change request. Suspends the license."""
    result = reject_device_change(db, request_id, current_user.id, data.note)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device change request not found or already processed",
        )
    return DeviceChangeRequestResponse.model_validate(result)


@router.post("/licenses/device-changes/auto-approve", status_code=status.HTTP_200_OK)
def run_auto_approve(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.DEVICE_REVIEW),
):
    """Auto-approve any device change requests past 24h expiry."""
    auto_approve_expired_requests(db)
    return {"message": "Auto-approve completed"}


@router.get("/licenses/device-changes/history", response_model=DeviceChangeHistoryResponse)
def get_device_change_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get device change history for the current user's school."""
    school_id = current_user.school_id
    requests = db.query(DeviceChangeRequest).filter(
        DeviceChangeRequest.school_id == school_id,
        DeviceChangeRequest.deleted_at.is_(None),
    ).order_by(DeviceChangeRequest.created_at.desc()).limit(50).all()

    from app.services.license_crypto import get_short_fingerprint
    return DeviceChangeHistoryResponse(
        device=get_short_fingerprint(),
        changes=[DeviceChangeRequestResponse.model_validate(r) for r in requests],
    )


@router.get("/licenses/device-changes/history/all", response_model=list[DeviceChangeHistoryResponse])
def get_all_device_change_history(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.DEVICE_REVIEW),
):
    """Get device change history across all schools (SUPER_ADMIN only)."""
    from app.models.school import School

    schools = db.query(School).filter(School.deleted_at.is_(None)).all()
    school_ids = [s.id for s in schools]

    # Batch-load device change requests to avoid N+1 queries
    all_requests = db.query(DeviceChangeRequest).filter(
        DeviceChangeRequest.school_id.in_(school_ids),
        DeviceChangeRequest.deleted_at.is_(None),
    ).order_by(DeviceChangeRequest.created_at.desc()).all() if school_ids else []

    # Group requests by school_id
    requests_by_school = {}
    for r in all_requests:
        requests_by_school.setdefault(r.school_id, []).append(r)

    result = []
    for school in schools:
        requests = requests_by_school.get(school.id, [])[:20]
        if requests:
            from app.services.license_crypto import get_short_fingerprint
            result.append(DeviceChangeHistoryResponse(
                device=f"{school.name} ({get_short_fingerprint()})",
                changes=[DeviceChangeRequestResponse.model_validate(r) for r in requests],
            ))
    return result
