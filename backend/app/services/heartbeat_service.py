"""License server heartbeat — periodic license validation from school servers."""
import json
import hmac
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from sqlalchemy.orm import Session
import httpx
from app.config import settings
from app.core.constants import HEARTBEAT_INTERVAL_HOURS
from app.models.school import School
from app.models.server import ServerIdentity
from app.models.license import License
from app.utils.circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)

LICENSE_SERVER_URL = settings.license_server_url
_heartbeat_breaker = CircuitBreaker("heartbeat", failure_threshold=3, recovery_timeout=120)


def _generate_hmac(school_code: str, secret: str) -> str:
    return hmac.new(secret.encode(), school_code.encode(), hashlib.sha256).hexdigest()


def send_heartbeat(db: Session) -> Dict:
    """Send heartbeat to license server with HW fingerprint. Returns server response."""
    identity = db.query(ServerIdentity).first()
    if not identity:
        return {"status": "error", "message": "Server not initialized"}

    school_code = identity.school_code or identity.server_id
    sync_secret = settings.sync_secret or "dev-heartbeat-secret"

    payload = {
        "server_id": identity.server_id,
        "school_code": school_code,
        "server_role": identity.server_role,
        "version": settings.build_id or "0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "license_key": identity.current_license_key or "",
    }

    def _do_heartbeat():
        r = httpx.post(
            f"{LICENSE_SERVER_URL}/api/v1/heartbeat",
            json=payload,
            headers={
                "X-Server-ID": identity.server_id,
                "X-HMAC-Signature": _generate_hmac(school_code, sync_secret),
                "Content-Type": "application/json",
            },
            timeout=15.0,
        )
        r.raise_for_status()
        return r.json()

    try:
        data = _heartbeat_breaker.call(_do_heartbeat)

        identity.last_heartbeat = datetime.now(timezone.utc)
        identity.last_heartbeat_response = json.dumps(data)
        db.commit()

        return data
    except Exception as e:
        identity.last_heartbeat = datetime.now(timezone.utc)
        identity.last_heartbeat_error = str(e)[:500]
        db.commit()
        logger.warning("Heartbeat failed: %s", e)
        return {"status": "error", "message": str(e)}


def check_heartbeat_due(db: Session) -> bool:
    """Check if heartbeat is due for any active server identity."""
    identity = db.query(ServerIdentity).first()
    if not identity:
        return False
    if not identity.last_heartbeat:
        return True
    elapsed = datetime.now(timezone.utc) - identity.last_heartbeat
    return elapsed >= timedelta(hours=HEARTBEAT_INTERVAL_HOURS)


def run_heartbeat_if_due(db: Session) -> Optional[Dict]:
    """Send heartbeat if enough time has passed since last one."""
    if check_heartbeat_due(db):
        return send_heartbeat(db)
    return None
