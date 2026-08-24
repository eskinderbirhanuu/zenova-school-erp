import hmac
import hashlib
import json
import time
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.sync_queue import SyncQueue, SyncStatus
from app.services import sync_service
from app.core.server_identity import get_server_identity
from app.config import settings

router = APIRouter(tags=["sync"])

# Allowed clock skew for sync HMAC expiry — sourced from config for deploy-time override
ALLOWED_CLOCK_SKEW = settings.sync_clock_skew


@router.get("/sync/status")
def sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school_id = str(current_user.school_id) if getattr(current_user, 'school_id', None) else None
    return {"queue": sync_service.get_queue_stats(db, school_id=school_id)}


@router.post("/sync/trigger")
def trigger_sync(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
):
    result = sync_service.process_queue(db)
    return result


@router.get("/sync/queue")
def sync_queue_list(
    status_filter: str = Query(None, alias="status"),
    limit: int = Query(50, alias="limit"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SyncQueue)
    # Tenant isolation: only show queue entries for the user's school
    school_id = getattr(current_user, 'school_id', None)
    if school_id is not None and not current_user.is_superuser:
        q = q.filter(SyncQueue.school_id == str(school_id))
    if status_filter:
        q = q.filter(SyncQueue.status == SyncStatus(status_filter))
    entries = q.order_by(SyncQueue.created_at.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "table_name": e.table_name,
            "record_id": e.record_id,
            "operation": e.operation.value if e.operation else None,
            "status": e.status.value if e.status else None,
            "priority": e.priority,
            "retry_count": e.retry_count,
            "error_message": e.error_message,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "synced_at": e.synced_at.isoformat() if e.synced_at else None,
        }
        for e in entries
    ]


@router.post("/sync/retry-failed")
def retry_failed(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
):
    q = db.query(SyncQueue).filter(SyncQueue.status == SyncStatus.FAILED)
    # Tenant isolation: only retry queue entries for the user's school
    school_id = getattr(current_user, 'school_id', None)
    if school_id is not None and not current_user.is_superuser:
        q = q.filter(SyncQueue.school_id == str(school_id))
    failed = q.all()
    for entry in failed:
        entry.status = SyncStatus.PENDING
    db.commit()
    return {"retried": len(failed)}


@router.post("/sync/purge")
def purge_old_sync(
    days: int = Query(30, alias="older_than_days"),
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    q = db.query(SyncQueue).filter(
        SyncQueue.synced_at.isnot(None),
        SyncQueue.synced_at < cutoff,
    )
    # Tenant isolation: only purge queue entries for the user's school
    school_id = getattr(current_user, 'school_id', None)
    if school_id is not None and not current_user.is_superuser:
        q = q.filter(SyncQueue.school_id == str(school_id))
    deleted = q.delete(synchronize_session=False)
    db.commit()
    return {"purged": deleted}


def _verify_sync_signature(payload: dict, signature: str, secret: str, server_id: str, sync_ts: str) -> bool:
    body_str = json.dumps(payload, sort_keys=True, default=str)
    body_hash = hashlib.sha256(body_str.encode()).hexdigest()
    # New format: {server_id}.{ts}.{body_hash}
    msg_new = f"{server_id}.{sync_ts}.{body_hash}".encode()
    expected_new = hmac.new(secret.encode(), msg_new, hashlib.sha256).hexdigest()
    if hmac.compare_digest(expected_new, signature):
        return True
    # Fallback to old format for backward compatibility: {server_id}.{ts}
    msg_old = f"{server_id}.{sync_ts}".encode()
    expected_old = hmac.new(secret.encode(), msg_old, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_old, signature)


@router.post("/sync/receive")
def receive_sync(
    payload: dict,
    x_zenova_server_id: str = Header(..., alias="X-Zenova-Server-Id"),
    x_zenova_sync_ts: str = Header(..., alias="X-Zenova-Sync-Ts"),
    x_zenova_sync_sig: str = Header(..., alias="X-Zenova-Sync-Sig"),
    db: Session = Depends(get_db),
):
    identity = get_server_identity() or {}
    secret = identity.get("sync_secret")
    if not secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Sync not configured")

    # ── Sender binding validation (SYNC-002) ─────────────────────────
    # Verify the sender server_id is registered and bound to a school.
    # A compromised sync secret should NOT allow data injection for
    # arbitrary schools.
    sender_school_id = payload.get("school_id")
    if sender_school_id:
        # The sender's school_id in the payload must match the school_id
        # registered for this server_id.  For MAIN_SCHOOL/BRANCH servers
        # the identity file contains the canonical school_id.
        local_school_id = identity.get("school_id")
        sender_role = identity.get("server_role")

        # SUPER_ADMIN and VPS servers can accept data for any school
        if sender_role not in ("SUPER_ADMIN", "VPS"):
            if local_school_id and str(sender_school_id) != str(local_school_id):
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN,
                    detail="Sender school_id does not match registered school",
                )

    # ── Signature verification ────────────────────────────────────────
    try:
        ts = int(x_zenova_sync_ts)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Bad timestamp")
    if abs(int(time.time()) - ts) > ALLOWED_CLOCK_SKEW:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Stale sync payload")
    if not _verify_sync_signature(payload, x_zenova_sync_sig, secret, x_zenova_server_id, x_zenova_sync_ts):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    table = payload.get("table")
    record_id = payload.get("record_id")
    operation = payload.get("operation")
    body = payload.get("payload")
    school_id = payload.get("school_id")

    if not all([table, record_id, operation]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Missing required fields")

    payload_hash = hashlib.sha256(
        json.dumps(body, sort_keys=True, default=str).encode()
    ).hexdigest()

    count = sync_service.apply_sync_payload(
        db, table=table, record_id=record_id,
        operation=operation, payload=body,
        payload_hash=payload_hash,
        school_id=school_id,
        source_server_id=x_zenova_server_id,
    )
    return {"received": True, "count": count}
