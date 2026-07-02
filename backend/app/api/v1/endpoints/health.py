import os
import time
import shutil
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.core import server_identity

router = APIRouter()

_app_start_time = time.time()


def _system_checks() -> dict:
    checks = {}

    try:
        usage = shutil.disk_usage("/")
        checks["disk"] = {
            "status": "operational",
            "total_gb": round(usage.total / (1024**3), 1),
            "free_gb": round(usage.free / (1024**3), 1),
            "used_pct": round(usage.used / usage.total * 100, 1),
        }
    except Exception:
        checks["disk"] = {"status": "unknown"}

    try:
        import psutil
        checks["cpu"] = {
            "status": "operational",
            "cores": os.cpu_count(),
            "used_pct": psutil.cpu_percent(interval=0.1),
        }
        mem = psutil.virtual_memory()
        checks["ram"] = {
            "status": "operational",
            "total_gb": round(mem.total / (1024**3), 1),
            "available_gb": round(mem.available / (1024**3), 1),
            "used_pct": mem.percent,
        }
    except ImportError:
        checks["cpu"] = {"status": "unknown", "cores": os.cpu_count()}
        checks["ram"] = {"status": "unknown"}

    return checks


def _sync_status(db: Session) -> dict:
    try:
        from app.models.sync_queue import SyncQueue
        from sqlalchemy import func
        pending = db.query(func.count(SyncQueue.id)).filter(
            SyncQueue.status.in_(["pending", "retrying"])
        ).scalar() or 0
        last_sync = db.query(SyncQueue).filter(
            SyncQueue.status == "synced"
        ).order_by(SyncQueue.updated_at.desc()).first()
        return {
            "pending": pending,
            "last_synced_at": last_sync.updated_at.isoformat() if last_sync else None,
        }
    except Exception:
        return {"pending": -1, "last_synced_at": None}


def _backup_status() -> dict:
    try:
        from app.services.backup_service import list_backups
        backups = list_backups()
        last_backup = backups[0] if backups else None
        return {
            "total_backups": len(backups),
            "last_backup_at": last_backup.get("created_at") if last_backup else None,
        }
    except Exception:
        return {"total_backups": -1, "last_backup_at": None}


@router.get("/")
def health_check(db: Session = Depends(get_db)):
    checks = {}
    overall = "ok"

    t0 = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - t0) * 1000, 1)
        checks["database"] = {"status": "operational", "latency_ms": latency}
    except Exception:
        checks["database"] = {"status": "down"}
        overall = "degraded"

    try:
        from app.core.redis_client import get_redis
        r = get_redis()
        r.ping()
        checks["redis"] = {"status": "operational"}
    except Exception:
        checks["redis"] = {"status": "down"}
        overall = "degraded"

    identity = server_identity.get_server_identity()
    checks["server_identity"] = {
        "status": "operational",
        "role": identity.get("server_role") if identity else None,
        "server_id": identity.get("server_id")[:8] + "..." if identity and identity.get("server_id") else None,
    }

    checks["system"] = _system_checks()
    checks["sync"] = _sync_status(db)
    checks["backup"] = _backup_status()

    checks["api"] = {"status": "operational"}
    uptime_seconds = int(time.time() - _app_start_time)
    checks["uptime"] = {"status": "operational", "seconds": uptime_seconds, "hours": round(uptime_seconds / 3600, 1)}

    return {
        "status": overall,
        "service": "zenova-erp",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }


@router.get("/live")
def livez():
    return {"status": "alive"}


@router.get("/ready")
def readyz(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return Response(
            content='{"status":"ready"}',
            media_type="application/json",
            status_code=status.HTTP_200_OK,
        )
    except Exception:
        return Response(
            content='{"status":"not ready"}',
            media_type="application/json",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
