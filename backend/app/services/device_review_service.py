import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.license import License, LicenseStatus
from app.config import settings

logger = logging.getLogger(__name__)
from app.models.device_change_request import DeviceChangeRequest
from app.models.communication import Notification
from app.models.user import User
from app.core.audit import log_audit


DEVICE_CHANGE_ESCALATION = {
    "major": (3, 5, "review_mode", "review_mode"),
    "full": (6, 8, "device_locked", "device_locked"),
}


def create_device_change_request(
    db: Session,
    license_record: License,
    old_hardware_id: str,
    match_count: int,
    total_components: int = 8,
) -> DeviceChangeRequest:
    """Create a device change request when HW mismatch is detected.

    Returns the created request. Also updates the license status and
    sends a notification to all SUPER_ADMIN users.
    """
    now = datetime.now(timezone.utc)
    changed_count = total_components - match_count

    if changed_count <= 2:
        status = "auto_approved"
    elif changed_count <= 5:
        status = "pending"
        license_record.status = LicenseStatus.REVIEW_MODE
        license_record.device_change_reason = f"Major HW change: {match_count}/{total_components} matched ({changed_count} different)"
        license_record.device_change_requested_at = now
    else:
        status = "pending"
        license_record.status = LicenseStatus.DEVICE_LOCKED
        license_record.device_change_reason = f"Full HW change: {match_count}/{total_components} matched ({changed_count} different)"
        license_record.device_change_requested_at = now

    change_request = DeviceChangeRequest(
        license_id=license_record.id,
        school_id=license_record.school_id,
        old_hardware_id=old_hardware_id,
        match_count=match_count,
        total_components=total_components,
        status=status,
        expires_at=now + timedelta(hours=24),
    )
    db.add(change_request)

    log_audit(
        db, "system", "DEVICE_CHANGE_REQUESTED", "device_change_requests",
        change_request.id,
        new_data={
            "license_id": license_record.id,
            "match_count": match_count,
            "total_components": total_components,
            "status": status,
        },
        school_id=license_record.school_id,
    )

    if status != "auto_approved":
        _notify_super_admins(db, license_record, match_count, total_components)

    db.commit()
    db.refresh(change_request)
    return change_request


def _notify_super_admins(
    db: Session,
    license_record: License,
    match_count: int,
    total_components: int,
):
    """Notify all SUPER_ADMIN users via in-app notification and email."""
    from app.services.email_service import send_email

    school_id = license_record.school_id or "unknown"
    title = "Device Change Requires Review"
    message = (
        f"License {license_record.key} detected a hardware change "
        f"({match_count}/{total_components} components matched). "
        f"Review required."
    )

    super_admins = (
        db.query(User)
        .filter(User.is_superuser == True, User.is_active == True)
        .all()
    )
    for admin in super_admins:
        db.add(Notification(
            user_id=admin.id,
            school_id=school_id if admin.school_id else school_id,
            title=title,
            message=message,
            notification_type="device_review",
            reference_type="device_change_requests",
        ))
        if admin.email:
            send_email(
                to_email=admin.email,
                subject=title,
                body_text=(
                    f"Hello {admin.full_name or 'Admin'},\n\n"
                    f"License {license_record.key} (School: {school_id}) has detected "
                    f"a hardware change: {match_count}/{total_components} components matched.\n\n"
                    f"Please review this device change at your earliest convenience.\n\n"
                    f"ZENOVA License System"
                ),
                body_html=(
                    f"<h2>{title}</h2>"
                    f"<p>Hello {admin.full_name or 'Admin'},</p>"
                    f"<p>License <b>{license_record.key}</b> (School: {school_id}) has detected "
                    f"a hardware change: <b>{match_count}/{total_components}</b> components matched.</p>"
                    f"<p>Please <a href='{getattr(settings, 'app_url', None) or 'http://localhost:3000'}/super-admin/device-changes'>review this device change</a> "
                    f"at your earliest convenience.</p>"
                    f"<p>ZENOVA License System</p>"
                ),
            )


def approve_device_change(
    db: Session,
    request_id: str,
    reviewer_id: str,
    note: str | None = None,
) -> DeviceChangeRequest | None:
    """Approve a device change request. Rebinds the license to current HW."""
    change_request = db.query(DeviceChangeRequest).filter(
        DeviceChangeRequest.id == request_id,
        DeviceChangeRequest.deleted_at.is_(None),
    ).first()
    if not change_request:
        return None
    if change_request.status != "pending":
        return None

    now = datetime.now(timezone.utc)
    change_request.status = "approved"
    change_request.reviewed_by = reviewer_id
    change_request.reviewed_at = now
    change_request.review_note = note

    license_record = db.query(License).filter(
        License.id == change_request.license_id,
        License.deleted_at.is_(None),
    ).first()
    if license_record:
        from app.services.license_crypto import get_machine_fingerprint, encode_hardware_components, get_fingerprint_components

        old_hw = license_record.hardware_id

        new_fingerprint = get_machine_fingerprint()
        license_record.machine_fingerprint = new_fingerprint
        license_record.hardware_id = encode_hardware_components(get_fingerprint_components())
        license_record.status = LicenseStatus.ACTIVE
        license_record.device_change_reason = None
        license_record.device_change_requested_at = None
        try:
            from app.services.tpm_service import seal_license_data
            license_record.tpm_sealed_data = seal_license_data(new_fingerprint)
        except Exception:
            pass

        change_request.new_hardware_id = license_record.hardware_id

        log_audit(
            db, reviewer_id, "DEVICE_CHANGE_APPROVED", "device_change_requests",
            change_request.id,
            old_data={"old_hardware_id": old_hw},
            new_data={"new_hardware_id": license_record.hardware_id, "note": note},
            school_id=change_request.school_id,
        )

    db.commit()
    db.refresh(change_request)
    return change_request


def reject_device_change(
    db: Session,
    request_id: str,
    reviewer_id: str,
    note: str | None = None,
) -> DeviceChangeRequest | None:
    """Reject a device change request. Suspends the license."""
    change_request = db.query(DeviceChangeRequest).filter(
        DeviceChangeRequest.id == request_id,
        DeviceChangeRequest.deleted_at.is_(None),
    ).first()
    if not change_request:
        return None
    if change_request.status != "pending":
        return None

    now = datetime.now(timezone.utc)
    change_request.status = "rejected"
    change_request.reviewed_by = reviewer_id
    change_request.reviewed_at = now
    change_request.review_note = note

    license_record = db.query(License).filter(
        License.id == change_request.license_id,
        License.deleted_at.is_(None),
    ).first()
    if license_record:
        license_record.status = LicenseStatus.SUSPENDED

        log_audit(
            db, reviewer_id, "DEVICE_CHANGE_REJECTED", "device_change_requests",
            change_request.id,
            new_data={"note": note},
            school_id=change_request.school_id,
        )

    db.commit()
    db.refresh(change_request)
    return change_request


def auto_approve_expired_requests(db: Session):
    """Auto-approve any pending device change requests past 24h expiry."""
    now = datetime.now(timezone.utc)
    expired = db.query(DeviceChangeRequest).filter(
        DeviceChangeRequest.status == "pending",
        DeviceChangeRequest.expires_at <= now,
        DeviceChangeRequest.deleted_at.is_(None),
    ).all()
    for req in expired:
        req.status = "auto_approved"
        req.reviewed_at = now
        req.review_note = "Auto-approved (24h expiry)"

        lic = db.query(License).filter(License.id == req.license_id).first()
        if lic:
            from app.services.license_crypto import get_machine_fingerprint, encode_hardware_components, get_fingerprint_components

            new_fingerprint = get_machine_fingerprint()
            lic.machine_fingerprint = new_fingerprint
            lic.hardware_id = encode_hardware_components(get_fingerprint_components())
            lic.status = LicenseStatus.ACTIVE
            lic.device_change_reason = None
            lic.device_change_requested_at = None
            try:
                from app.services.tpm_service import seal_license_data
                lic.tpm_sealed_data = seal_license_data(new_fingerprint)
            except Exception:
                pass

            req.new_hardware_id = lic.hardware_id

            log_audit(
                db, "system", "DEVICE_CHANGE_AUTO_APPROVED", "device_change_requests",
                req.id,
                old_data={"old_hardware_id": req.old_hardware_id},
                new_data={"new_hardware_id": lic.hardware_id},
                school_id=req.school_id,
            )
    if expired:
        db.commit()


def archive_old_device_changes(db: Session):
    """Archive device change requests older than 30 days.

    First auto-approves any expired pending requests, then marks
    resolved requests (approved/rejected/auto_approved) older than
    30 days as 'archived'.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)

    auto_approve_expired_requests(db)

    old_resolved = db.query(DeviceChangeRequest).filter(
        DeviceChangeRequest.status.in_(["approved", "rejected", "auto_approved"]),
        DeviceChangeRequest.expires_at <= cutoff,
        DeviceChangeRequest.deleted_at.is_(None),
    ).all()
    for req in old_resolved:
        req.status = "archived"
        req.deleted_at = now

    if old_resolved:
        db.commit()
        logger.info("Archived %d old device change requests", len(old_resolved))
    return len(old_resolved)
