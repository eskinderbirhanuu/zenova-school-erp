import hmac
import hashlib
import json
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.sync_queue import SyncQueue, SyncStatus
from app.services import sync_service
from app.core.server_identity import get_server_identity

router = APIRouter(tags=["sync"])

ALLOWED_CLOCK_SKEW = 60


@router.get("/sync/status")
def sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"queue": sync_service.get_queue_stats(db)}


@router.post("/sync/trigger")
def trigger_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    failed = db.query(SyncQueue).filter(
        SyncQueue.status == SyncStatus.FAILED
    ).all()
    for entry in failed:
        entry.status = SyncStatus.PENDING
    db.commit()
    return {"retried": len(failed)}


@router.post("/sync/purge")
def purge_old_sync(
    days: int = Query(30, alias="older_than_days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    deleted = db.query(SyncQueue).filter(
        SyncQueue.synced_at.isnot(None),
        SyncQueue.synced_at < cutoff,
    ).delete(synchronize_session=False)
    db.commit()
    return {"purged": deleted}


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
    try:
        ts = int(x_zenova_sync_ts)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Bad timestamp")
    if abs(int(time.time()) - ts) > ALLOWED_CLOCK_SKEW:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Stale sync payload")
    msg = f"{x_zenova_server_id}.{x_zenova_sync_ts}".encode()
    expected = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_zenova_sync_sig):
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
    )
    return {"received": True, "count": count}
