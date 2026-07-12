from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.schemas.communication import (
    AnnouncementCreate, AnnouncementResponse, NotificationResponse,
    MessageCreate, MessageResponse,
)
from app.schemas.notification import NotificationPreferenceResponse, NotificationPreferenceUpdate
from app.core.pagination import paginate, build_paginated_response
from app.models.communication import Notification, Message
from app.services import communication_service
from app.models.user import User
from app.models.notification_preference import NotificationPreference

router = APIRouter()
ADMIN = [require_permission(Permission.SETTINGS_MANAGE)]
ALL = [
    require_permission(
        Permission.STUDENT_VIEW,
        Permission.FINANCE_ENTRY,
        Permission.HR_MANAGE,
        Permission.INVENTORY_MANAGE,
        Permission.LIBRARY_MANAGE,
        Permission.CAFETERIA_POS,
    ),
]
MESSAGING = [
    require_permission(
        Permission.STUDENT_VIEW,
        Permission.FINANCE_ENTRY,
        Permission.HR_MANAGE,
        Permission.INVENTORY_MANAGE,
        Permission.LIBRARY_MANAGE,
        Permission.CAFETERIA_POS,
    ),
]


@router.post("/announcements", response_model=AnnouncementResponse, dependencies=ADMIN)
def communication_create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return communication_service.create_announcement(db, current_user.school_id, data, current_user.id)


@router.get("/announcements", dependencies=ALL)
def communication_list_announcements(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    from app.models.announcement import Announcement
    q = db.query(Announcement).filter(Announcement.school_id == current_user.school_id).order_by(Announcement.created_at.desc())
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return {"total": total, "data": items, "skip": skip, "limit": limit}


@router.get("/notifications", dependencies=ALL)
def list_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    q = q.order_by(Notification.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


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
    # Tenant isolation: a non-superuser may only message users in their own school
    # (prevents cross-tenant messaging and user-id enumeration via 404).
    q = db.query(User).filter(User.id == data.recipient_id, User.deleted_at.is_(None))
    if not current_user.is_superuser:
        q = q.filter(User.school_id == current_user.school_id)
    recipient = q.first()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")
    m = communication_service.send_message(db, current_user.id, data.recipient_id, data.subject, data.message, current_user.school_id)
    sender = current_user
    return MessageResponse(
        id=m.id, sender_id=m.sender_id, recipient_id=m.recipient_id,
        subject=m.subject, message=m.message, is_read=m.is_read,
        read_at=m.read_at, sender_name=sender.full_name, created_at=m.created_at,
    )


@router.get("/messages", dependencies=MESSAGING)
def list_messages(
    include_sent: bool = Query(False),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    q = db.query(Message).filter(
        (Message.recipient_id == current_user.id) | (Message.sender_id == current_user.id) if include_sent else (Message.recipient_id == current_user.id)
    ).order_by(Message.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    messages = paginated_q.all()
    sender_ids = {m.sender_id for m in messages}
    users_map = {}
    if sender_ids:
        users = db.query(User).filter(User.id.in_(sender_ids)).all()
        users_map = {u.id: u.full_name for u in users}
    return build_paginated_response(
        items=[
            MessageResponse(
                id=m.id, sender_id=m.sender_id, recipient_id=m.recipient_id,
                subject=m.subject, message=m.message, is_read=m.is_read,
                read_at=m.read_at, sender_name=users_map.get(m.sender_id),
                created_at=m.created_at,
            )
            for m in messages
        ],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


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
