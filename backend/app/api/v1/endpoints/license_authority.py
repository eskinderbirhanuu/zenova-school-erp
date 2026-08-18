"""License authority endpoints — served by ZENOVA org (super-admin) servers so
school servers can verify their licenses against the org.

This mirrors the contract of the standalone license-server project
(`/api/v1/license/ping`, `/api/v1/license/school-verify`, `/api/v1/heartbeat`)
so that `ZENOVA_LICENSE_SERVER` can point at an org deployment.
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
from app.models.license import License
from app.models.server import ServerIdentity
from app.services import license_service
from app.services.license_crypto import get_short_fingerprint

logger = logging.getLogger(__name__)

router = APIRouter(tags=["license-authority"])


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


@router.post("/heartbeat")
def license_heartbeat(
    payload: HeartbeatPayload,
    request: Request,
    x_server_id: str | None = Header(default=None),
    x_hmac_signature: str | None = Header(default=None),
):
    """Receive heartbeat from school servers (HMAC-verified when secret configured)."""
    secret = settings.sync_secret or ""
    if secret and x_hmac_signature:
        expected = hmac.new(
            secret.encode(), payload.school_code.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, x_hmac_signature):
            logger.warning("Heartbeat rejected: bad HMAC from %s", x_server_id or payload.server_id)
            return {"status": "rejected", "message": "Invalid HMAC signature"}

    if x_hmac_signature and not secret:
        logger.warning("Heartbeat HMAC provided but no sync_secret configured on this server")

    logger.info(
        "Heartbeat from %s (role=%s, school=%s, version=%s)",
        payload.server_id, payload.server_role, payload.school_code, payload.version,
    )
    return {"status": "ok", "received_at": datetime.now(timezone.utc).isoformat()}
