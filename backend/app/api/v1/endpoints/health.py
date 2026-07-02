from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.core import server_identity
from datetime import datetime, timezone

router = APIRouter()


@router.get("/")
def health_check(db: Session = Depends(get_db)):
    checks = {}
    overall = "ok"

    import time
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

    checks["api"] = {"status": "operational"}
    checks["uptime"] = {"status": "operational"}

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
