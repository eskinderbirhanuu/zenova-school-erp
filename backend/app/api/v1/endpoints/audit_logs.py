from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.pagination import paginate, build_paginated_response

router = APIRouter(tags=["audit"])


@router.get("/audit-logs")
def list_audit_logs(
    action: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AuditLog)
    if not current_user.is_superuser:
        q = q.filter(AuditLog.school_id == current_user.school_id)
    if action:
        q = q.filter(AuditLog.action == action.upper())
    if search:
        s = f"%{search}%"
        q = q.filter(AuditLog.table_name.ilike(s) | AuditLog.action.ilike(s))
    q = q.order_by(AuditLog.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    logs = paginated_q.all()

    user_ids = {log.user_id for log in logs if log.user_id}
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u.email or u.full_name for u in users}

    return build_paginated_response(
        items=[
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
        total=total,
        page=cur_page,
        page_size=cur_size,
        total_pages=total_pages,
    )