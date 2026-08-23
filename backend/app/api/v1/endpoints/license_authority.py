"""License authority endpoints — served by ZENOVA org (super-admin) servers so
school servers can verify their licenses against the org.

This mirrors the contract of the standalone license-server project
(`/api/v1/license/ping`, `/api/v1/license/school-verify`, `/api/v1/heartbeat`)
so that `ZENOVA_LICENSE_SERVER` can point at an org deployment.

Remote control: every heartbeat is persisted (`school_heartbeats`) and the
response carries control directives derived from the school's license status
(suspend/force_verify), so org actions (revoke/suspend/renew) reach the school
within one heartbeat interval instead of the 30-minute verify cache.
"""
import hmac
import hashlib
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.heartbeat import SchoolHeartbeat
from app.models.license import License, LicenseStatus
from app.models.school import School
from app.services import license_service
from app.services.license_crypto import get_short_fingerprint

logger = logging.getLogger(__name__)

router = APIRouter(tags=["license-authority"])

CONTROL_SUSPENDED = LicenseStatus.SUSPENDED.value
CONTROL_REVOKED = LicenseStatus.REVOKED.value


class SchoolVerifyRequest(BaseModel):
    key: str
    machine_fingerprint: str | None = None
    tpm_sealed: str | None = None
    environment: str | None = None


class SchoolVerifyResponse(BaseModel):
    valid: bool
    license_type: str | None = None
    status: str | None = None
    valid_until: str | None = None
    max_users: int | None = None
    message: str = ""


class HeartbeatPayload(BaseModel):
    server_id: str
    school_code: str = ""
    server_role: str | None = None
    version: str = "0"
    timestamp: str | None = None
    license_key: str = ""


class ControlDirective(BaseModel):
    suspend: bool = False
    force_verify: bool = False
    message: str = ""


class HeartbeatResponse(BaseModel):
    status: str
    received_at: str
    control: ControlDirective = ControlDirective()


def _build_control(db: Session, payload: HeartbeatPayload) -> ControlDirective:
    """Derive remote-control directives from the school's license state.

    Suspended/revoked/expired licenses (or deactivated schools) → suspend now,
    so the school locks within one heartbeat interval. force_verify is set when
    the cached verification may be stale (status changed recently).
    """
    control = ControlDirective()
    school = None
    if payload.school_code:
        school = db.query(School).filter(School.code == payload.school_code).first()
    elif payload.license_key:
        lic = db.query(License).filter(License.key == payload.license_key).first()
        if lic and lic.school_id:
            school = db.query(School).filter(School.id == lic.school_id).first()

    if school is not None and not school.is_active:
        control.suspend = True
        control.message = "School deactivated by ZENOVA. Contact support."
        return control

    lic = None
    if payload.license_key:
        lic = db.query(License).filter(License.key == payload.license_key).first()
    elif school is not None:
        lic = db.query(License).filter(License.school_id == school.id, License.deleted_at.is_(None)).first()

    if lic is not None and lic.status in (LicenseStatus.SUSPENDED, LicenseStatus.REVOKED):
        control.suspend = True
        control.force_verify = True
        control.message = (
            f"License {lic.status.value} by ZENOVA. Contact support."
            if lic.status == LicenseStatus.SUSPENDED
            else "License revoked by ZENOVA."
        )
    return control


@router.get("/license/ping")
def license_ping():
    """Health probe used by `_can_reach_license_server`."""
    return {"status": "ok"}


@router.post("/license/school-verify", response_model=SchoolVerifyResponse)
def license_school_verify(data: SchoolVerifyRequest, db: Session = Depends(get_db)):
    """Public verify endpoint — called by school servers (no admin token needed)."""
    result = license_service.verify_license(db, data.key)
    if not result["valid"]:
        return SchoolVerifyResponse(valid=False, message=result["message"])

    lic = db.query(License).filter(License.key == data.key).first()
    valid_until = None
    max_users = None
    if lic:
        valid_until = lic.valid_until.isoformat() if lic.valid_until else None
        max_users = lic.max_users

    return SchoolVerifyResponse(
        valid=True,
        license_type=result.get("license_type"),
        status=lic.status.value if lic and lic.status else None,
        valid_until=valid_until,
        max_users=max_users,
        message="License is valid",
    )


@router.post("/heartbeat", response_model=HeartbeatResponse)
def license_heartbeat(
    payload: HeartbeatPayload,
    request: Request,
    db: Session = Depends(get_db),
    x_server_id: str | None = Header(default=None),
    x_hmac_signature: str | None = Header(default=None),
):
    """Receive heartbeat from school servers (HMAC-verified when secret configured).

    Persists the heartbeat and returns control directives so org license actions
    are applied by the school promptly (≤1 heartbeat interval).
    """
    secret = settings.sync_secret or ""
    status = "ok"
    if secret and x_hmac_signature:
        expected = hmac.new(
            secret.encode(), payload.school_code.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, x_hmac_signature):
            logger.warning("Heartbeat rejected: bad HMAC from %s", x_server_id or payload.server_id)
            status = "rejected"

    if x_hmac_signature and not secret:
        logger.warning("Heartbeat HMAC provided but no sync_secret configured on this server")

    client_ip = request.client.host if request.client else None

    try:
        db.add(SchoolHeartbeat(
            server_id=payload.server_id,
            school_code=payload.school_code or payload.server_id,
            server_role=payload.server_role,
            version=payload.version,
            license_key=payload.license_key or None,
            ip_address=client_ip,
            status=status,
            received_at=datetime.now(timezone.utc),
        ))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist heartbeat from %s", payload.server_id)

    control = ControlDirective() if status == "rejected" else _build_control(db, payload)

    logger.info(
        "Heartbeat from %s (role=%s, school=%s, version=%s, ip=%s, control=%s)",
        payload.server_id, payload.server_role, payload.school_code, payload.version,
        client_ip, control.model_dump(exclude_defaults=True),
    )
    return HeartbeatResponse(
        status=status,
        received_at=datetime.now(timezone.utc).isoformat(),
        control=control,
    )