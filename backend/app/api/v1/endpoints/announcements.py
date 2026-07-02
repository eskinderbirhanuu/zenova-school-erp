from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse

router = APIRouter(tags=["announcements"])


@router.post("/announcements", response_model=AnnouncementResponse, status_code=201)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SCHOOL_MANAGE),
):
    announcement = Announcement(
        title=data.title,
        content=data.content,
        target_roles=data.target_roles or "",
        school_id=current_user.school_id,
        created_by=current_user.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.get("/announcements", response_model=list[AnnouncementResponse])
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Announcement).filter(
        Announcement.school_id == current_user.school_id,
        Announcement.is_published == True,
    ).order_by(Announcement.created_at.desc()).limit(50).all()
    return q


@router.get("/announcements/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.school_id == current_user.school_id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return a


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SCHOOL_MANAGE),
):
    a = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.school_id == current_user.school_id,
    ).execution_options(include_deleted=True).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    a.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Announcement deleted"}
