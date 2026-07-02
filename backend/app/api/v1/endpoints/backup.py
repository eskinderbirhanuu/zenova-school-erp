import os
import re
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user, get_client_ip
from app.core.audit import log_audit
from app.core.permissions import require_role
from app.models.user import User
from app.services import backup_service

router = APIRouter(tags=["backup"])

SAFE_FILENAME = re.compile(r"^[A-Za-z0-9_.-]{1,128}$")


def _safe_path(filename: str) -> str:
    if not SAFE_FILENAME.match(filename):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid filename")
    base = os.path.realpath(backup_service.BACKUP_DIR)
    resolved = os.path.realpath(os.path.join(base, filename))
    if os.path.commonpath([resolved, base]) != base:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid filename")
    return resolved


@router.get("/backups")
def list_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"backups": backup_service.list_backups()}


@router.post("/backups")
def create_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        entry = backup_service.create_backup()
        return {"success": True, "backup": entry}
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/backups/{filename}/download")
def download_backup(
    filename: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = require_role("SUPER_ADMIN"),
):
    filepath = _safe_path(filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file not found")
    log_audit(db, current_user.id, "BACKUP_DOWNLOADED", "backup", filename,
              ip_address=get_client_ip(request), user_agent=request.headers.get("user-agent"))
    db.commit()
    return FileResponse(filepath, filename=filename, media_type="application/octet-stream")


@router.delete("/backups/{filename}")
def delete_backup(
    filename: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = require_role("SUPER_ADMIN"),
):
    _safe_path(filename)
    backup_service.delete_backup(filename)
    log_audit(db, current_user.id, "BACKUP_DELETED", "backup", filename,
              ip_address=get_client_ip(request), user_agent=request.headers.get("user-agent"))
    db.commit()
    return {"success": True}
