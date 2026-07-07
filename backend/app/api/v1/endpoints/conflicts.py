from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.conflict_log import ConflictLog

router = APIRouter(tags=["conflicts"])


@router.get("/sync/conflicts")
def list_conflicts(
    status_filter: str = Query(None, alias="status"),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.LICENSE_MANAGE),
):
    q = db.query(ConflictLog)
    if status_filter:
        q = q.filter(ConflictLog.resolution == status_filter)
    entries = q.order_by(ConflictLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "table_name": e.table_name,
            "record_id": e.record_id,
            "local_version": e.local_version,
            "incoming_version": e.incoming_version,
            "source_server_id": e.source_server_id,
            "resolution": e.resolution,
            "resolved_by": e.resolved_by,
            "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.post("/sync/conflicts/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: str,
    resolution: str = Query(..., description="'local_wins' or 'incoming_wins'"),
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.LICENSE_MANAGE),
):
    conflict = db.query(ConflictLog).filter(ConflictLog.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conflict not found")
    if resolution not in ("local_wins", "incoming_wins"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Resolution must be 'local_wins' or 'incoming_wins'")
    conflict.resolution = resolution
    conflict.resolved_by = current_user.id
    conflict.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "resolution": resolution}
