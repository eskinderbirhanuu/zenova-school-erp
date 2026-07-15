import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.sync_queue import SyncQueue, SyncStatus
from app.models.sync_inbound import SyncInbound

VPS_SYNC_ENABLED = False

PRIORITY = {
    "attendance": "1",
    "payments": "2",
    "journal_entries": "2",
    "students": "3",
    "users": "3",
    "cafeteria_orders": "3",
    "cafeteria_products": "4",
    "notifications": "5",
}


def enqueue_sync(
    db: Session,
    table_name: str,
    record_id: str,
    operation: str,
    payload: dict = None,
    school_id: str = None,
    branch_id: str = None,
    source_version: str = None,
) -> SyncQueue:
    entry = SyncQueue(
        table_name=table_name,
        record_id=record_id,
        operation=operation,
        priority=PRIORITY.get(table_name, "5"),
        payload=json.dumps(payload) if payload else None,
        school_id=school_id,
        branch_id=branch_id,
        source_version=source_version,
    )
    db.add(entry)
    db.commit()
    return entry


def process_queue(db: Session, limit: int = 50) -> dict:
    from app.core import server_identity

    identity = server_identity.get_server_identity()
    if not identity:
        return {"error": "Server not registered"}

    server_role = identity.get("server_role")
    vps_url = identity.get("vps_url")

    if server_role in ("MAIN_SCHOOL", "BRANCH") and vps_url:
        global VPS_SYNC_ENABLED
        VPS_SYNC_ENABLED = True
    else:
        return {"synced": 0, "error": "No VPS configured. Set VPS URL in Settings first."}

    pending = db.query(SyncQueue).filter(
        SyncQueue.status == SyncStatus.PENDING
    ).order_by(SyncQueue.priority.asc(), SyncQueue.created_at.asc()).limit(limit).all()

    synced_count = 0
    failed_count = 0
    errors = []

    for entry in pending:
        try:
            _send_to_vps(entry)
            entry.status = SyncStatus.SYNCED
            entry.synced_at = datetime.now(timezone.utc)
            synced_count += 1
        except Exception as e:
            entry.status = SyncStatus.FAILED
            entry.error_message = str(e)
            entry.retry_count = str(int(entry.retry_count or "0") + 1)
            failed_count += 1
            errors.append({"id": entry.id, "error": str(e)})

    db.commit()

    return {
        "synced": synced_count,
        "failed": failed_count,
        "pending_remaining": db.query(SyncQueue).filter(
            SyncQueue.status == SyncStatus.PENDING
        ).count(),
        "errors": errors,
    }


def _validate_vps_url_at_connect(vps_url: str) -> str:
    """Validate VPS URL at connection time (anti-DNS-rebinding). Returns the URL or raises."""
    from urllib.parse import urlparse
    import socket

    parsed = urlparse(vps_url)
    hostname = parsed.hostname
    if not hostname:
        raise RuntimeError("Invalid VPS URL: no hostname")

    try:
        addrs = socket.getaddrinfo(hostname, None)
        resolved = set()
        for family, _, _, _, sockaddr in addrs:
            resolved.add(sockaddr[0])

        from ipaddress import ip_address
        for ip_str in resolved:
            addr = ip_address(ip_str)
            if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_multicast:
                raise RuntimeError(f"VPS URL resolves to internal IP: {ip_str}")
    except socket.gaierror as e:
        raise RuntimeError(f"VPS URL DNS resolution failed: {e}")

    return vps_url


def _send_to_vps(entry: SyncQueue):
    from app.core import server_identity
    import hmac
    import hashlib
    import time

    identity = server_identity.get_server_identity()
    vps_url = identity.get("vps_url")
    if not vps_url:
        raise RuntimeError("No VPS URL configured")
    sync_secret = identity.get("sync_secret")
    if not sync_secret:
        raise RuntimeError("No sync_secret configured")

    _validate_vps_url_at_connect(vps_url)

    import urllib.request
    import urllib.error

    server_id = identity.get("server_id", "")
    sync_ts = str(int(time.time()))
    body_dict = {
        "table": entry.table_name,
        "record_id": entry.record_id,
        "operation": entry.operation,
        "payload": json.loads(entry.payload) if entry.payload else None,
        "school_id": entry.school_id,
        "branch_id": entry.branch_id,
        "server_id": server_id,
    }
    data = json.dumps(body_dict).encode("utf-8")

    msg = f"{server_id}.{sync_ts}".encode()
    sig = hmac.new(sync_secret.encode(), msg, hashlib.sha256).hexdigest()

    req = urllib.request.Request(
        f"{vps_url.rstrip('/')}/api/v1/sync/receive",
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Zenova-Server-Id": server_id,
            "X-Zenova-Sync-Ts": sync_ts,
            "X-Zenova-Sync-Sig": sig,
        },
        method="POST",
    )

    try:
        urllib.request.urlopen(req, timeout=30)
    except urllib.error.URLError as e:
        raise RuntimeError(f"VPS unreachable: {e.reason}")


def get_queue_stats(db: Session) -> dict:
    from sqlalchemy import func

    total = db.query(func.count(SyncQueue.id)).scalar() or 0
    pending = db.query(func.count(SyncQueue.id)).filter(
        SyncQueue.status == SyncStatus.PENDING
    ).scalar() or 0
    synced = db.query(func.count(SyncQueue.id)).filter(
        SyncQueue.status == SyncStatus.SYNCED
    ).scalar() or 0
    failed = db.query(func.count(SyncQueue.id)).filter(
        SyncQueue.status == SyncStatus.FAILED
    ).scalar() or 0

    return {
        "total": total,
        "pending": pending,
        "synced": synced,
        "failed": failed,
        "vps_connected": VPS_SYNC_ENABLED,
    }


def apply_sync_payload(
    db: Session,
    table: str,
    record_id: str,
    operation: str,
    payload: dict,
    payload_hash: str,
    school_id: str = None,
    source_server_id: str = "unknown",
) -> int:
    existing = db.query(SyncInbound).filter(
        SyncInbound.payload_hash == payload_hash,
        SyncInbound.source_server_id == source_server_id,
    ).first()
    if existing:
        return 0

    incoming_version = payload.get("version") or payload.get("updated_at", "")

    if table == "students":
        from app.models.student import Student
        local = db.query(Student).filter(Student.id == record_id).first()
        if local and incoming_version:
            local_ver = getattr(local, "updated_at", None) or getattr(local, "created_at", None)
            if local_ver and incoming_version < str(local_ver.timestamp()):
                _log_conflict(db, table, record_id, str(local_ver), incoming_version, None, json.dumps(payload), source_server_id)
                inbound = SyncInbound(
                    source_server_id=source_server_id,
                    table_name=table, record_id=record_id,
                    operation=operation, payload_hash=payload_hash,
                    payload=json.dumps(payload) if payload else None,
                    source_version=str(incoming_version),
                )
                db.add(inbound)
                db.commit()
                return 0

    inbound = SyncInbound(
        source_server_id=source_server_id,
        table_name=table, record_id=record_id,
        operation=operation, payload_hash=payload_hash,
        payload=json.dumps(payload) if payload else None,
        source_version=str(incoming_version),
    )
    db.add(inbound)
    db.commit()
    return 1


def _log_conflict(
    db: Session,
    table_name: str,
    record_id: str,
    local_version: str,
    incoming_version: str,
    local_data: str = None,
    incoming_data: str = None,
    source_server_id: str = None,
):
    from app.models.conflict_log import ConflictLog
    existing = db.query(ConflictLog).filter(
        ConflictLog.table_name == table_name,
        ConflictLog.record_id == record_id,
        ConflictLog.resolution == "unresolved",
    ).first()
    if existing:
        return
    conflict = ConflictLog(
        table_name=table_name,
        record_id=record_id,
        local_version=local_version,
        incoming_version=incoming_version,
        local_data=local_data,
        incoming_data=incoming_data,
        source_server_id=source_server_id,
    )
    db.add(conflict)
    db.commit()
