from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.permissions import require_role
from app.models.user import User
from app.services import archive_service

router = APIRouter(tags=["archive"])


@router.get("/archive/status")
def archive_status(
    db: Session = Depends(get_db),
    current_user: User = require_role("SUPER_ADMIN"),
):
    return {
        "jobs": archive_service.get_archive_status(db),
        "table_sizes": archive_service.get_table_sizes(db),
        "archivable_tables": list(archive_service.ARCHIVABLE_TABLES.keys()),
    }


@router.post("/archive/run")
def run_archive(
    table_name: str = Query(None, description="Specific table or all archivable tables"),
    db: Session = Depends(get_db),
    current_user: User = require_role("SUPER_ADMIN"),
):
    if table_name and table_name not in archive_service.ARCHIVABLE_TABLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown table '{table_name}'. Valid: {list(archive_service.ARCHIVABLE_TABLES.keys())}",
        )
    result = archive_service.run_archive(db, table_name=table_name, user_id=current_user.id)
    return result


@router.post("/archive/restore")
def restore_archived(
    archive_ids: list[str],
    force: bool = Query(False, description="Overwrite existing records"),
    db: Session = Depends(get_db),
    current_user: User = require_role("SUPER_ADMIN"),
):
    if not archive_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No archive IDs provided")
    result = archive_service.restore_records(db, archive_ids, force=force)
    return result
