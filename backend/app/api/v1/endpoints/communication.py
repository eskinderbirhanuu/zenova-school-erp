from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.schemas.communication import (
    AnnouncementCreate, AnnouncementResponse, NotificationResponse,
    MessageCreate, MessageResponse,
)
from app.schemas.notification import NotificationPreferenceResponse, NotificationPreferenceUpdate
from app.services import communication_service
from app.models.user import User
from app.models.notification_preference import NotificationPreference

router = APIRouter()
ADMIN = [require_role("ADMIN")]
ALL = [require_role("ADMIN"), require_role("DIRECTOR"), require_role("REGISTRAR"),
       require_role("TEACHER"), require_role("FINANCE"), require_role("HR"),
       require_role("INVENTORY"), require_role("LIBRARY"), require_role("CAFETERIA")]
MESSAGING = [require_role("ADMIN"), require_role("DIRECTOR"), require_role("REGISTRAR"),
             require_role("TEACHER"), require_role("FINANCE"), require_role("HR"),
             require_role("INVENTORY"), require_role("LIBRARY"), require_role("CAFETERIA")]


@router.post("/announcements", response_model=AnnouncementResponse, dependencies=ADMIN)
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return communication_service.create_announcement(db, current_user.school_id, data, current_user.id)


@router.get("/announcements", response_model=list[AnnouncementResponse], dependencies=ALL)
def list_announcements(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return communication_service.get_announcements(db, current_user.school_id)


@router.get("/notifications", response_model=list[NotificationResponse], dependencies=ALL)
def list_notifications(unread_only: bool = Query(False), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return communication_service.get_notifications(db, current_user.id, unread_only)


@router.post("/notifications/{notification_id}/read", dependencies=ALL)
def mark_read(notification_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    communication_service.mark_notification_read(db, notification_id, current_user.id)
    return {"message": "Marked as read"}


@router.post("/notifications/read-all", dependencies=ALL)
def mark_all_read(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    communication_service.mark_all_read(db, current_user.id)
    return {"message": "All marked as read"}


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, dependencies=MESSAGING)
def send_message(data: MessageCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    recipient = db.query(User).filter(User.id == data.recipient_id, User.deleted_at.is_(None)).first()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")
    m = communication_service.send_message(db, current_user.id, data.recipient_id, data.subject, data.message, current_user.school_id)
    sender = current_user
    return MessageResponse(
        id=m.id, sender_id=m.sender_id, recipient_id=m.recipient_id,
        subject=m.subject, message=m.message, is_read=m.is_read,
        read_at=m.read_at, sender_name=sender.full_name, created_at=m.created_at,
    )


@router.get("/messages", response_model=list[MessageResponse], dependencies=MESSAGING)
def list_messages(include_sent: bool = Query(False), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return communication_service.get_messages(db, current_user.id, include_sent)


@router.post("/messages/{message_id}/read", dependencies=MESSAGING)
def mark_message_read(message_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    communication_service.mark_message_read(db, message_id, current_user.id)
    return {"message": "Message marked as read"}


@router.get("/notifications/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


@router.put("/notifications/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(data: NotificationPreferenceUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)
    if data.email_on is not None:
        pref.email_on = data.email_on
    if data.telegram_on is not None:
        pref.telegram_on = data.telegram_on
    if data.sms_on is not None:
        pref.sms_on = data.sms_on
    db.commit()
    db.refresh(pref)
    return pref
