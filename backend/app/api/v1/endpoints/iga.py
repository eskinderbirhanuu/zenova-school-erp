from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.services.iga_service import get_iga_summary
from app.models.server import ServerIdentity
from app.core.permissions import require_permission, Permission
from sqlalchemy import text
from datetime import datetime, timezone

router = APIRouter(tags=["iga"])


@router.get("/iga/metrics")
def iga_metrics(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.AUDIT_VIEW),
):
    summary = get_iga_summary(db)
    return summary


@router.get("/iga/health-summary")
def iga_health_summary(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.AUDIT_VIEW),
):
    from app.core import server_identity

    identity = server_identity.get_server_identity()
    server_rows = db.query(ServerIdentity).all()

    checks = {
        "database": "healthy",
        "server_identity": "healthy" if identity else "missing",
    }

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception:
        checks["database"] = "unhealthy"

    return {
        "status": "healthy" if all(v == "healthy" for v in checks.values()) else "degraded",
        "checks": checks,
        "servers": [
            {
                "server_id": s.server_id,
                "role": s.server_role.value if s.server_role else None,
                "is_trusted": s.is_trusted,
                "sync_enabled": s.sync_enabled,
                "vps_url": s.vps_url,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in server_rows
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
