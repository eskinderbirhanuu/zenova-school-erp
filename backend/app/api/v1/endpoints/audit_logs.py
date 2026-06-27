from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter(tags=["audit"])


@router.get("/audit-logs")
def list_audit_logs(
    action: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        return {"logs": [], "total": 0}
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action.upper())
    if search:
        s = f"%{search}%"
        q = q.filter(AuditLog.table_name.ilike(s) | AuditLog.action.ilike(s))
    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    user_ids = {log.user_id for log in logs if log.user_id}
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u.email or u.full_name for u in users}

    return {
        "logs": [
            {
                "id": str(log.id),
                "action": log.action,
                "user": users_map.get(log.user_id, "System"),
                "resource": log.table_name or "",
                "details": f"{log.action} on {log.table_name} (record: {log.record_id[:8]}...)" if log.table_name else "",
                "ip_address": log.ip_address or "",
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
    }