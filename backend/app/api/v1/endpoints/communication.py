from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.schemas.communication import (
    NotificationResponse,
    MessageCreate, MessageResponse,
)
from app.schemas.notification import (
    NotificationPreferenceResponse, NotificationPreferenceUpdate,
    PushDeviceRegister, PushDeviceResponse,
)
from app.core.pagination import paginate, build_paginated_response
from app.models.communication import Notification, Message
from app.models.push_device import PushDevice
from app.services import communication_service
from app.models.user import User
from app.models.notification_preference import NotificationPreference
from app.config import settings

router = APIRouter()
ADMIN = [require_permission(Permission.SETTINGS_MANAGE)]
_ALL_PERMS = [
    require_permission(
        Permission.STUDENT_VIEW,
        Permission.FINANCE_ENTRY,
        Permission.HR_MANAGE,
        Permission.INVENTORY_MANAGE,
        Permission.LIBRARY_MANAGE,
        Permission.CAFETERIA_POS,
    ),
]
ALL = _ALL_PERMS
MESSAGING = _ALL_PERMS

# Gap N1: notification/message READS are strictly user-scoped
# (Notification.user_id / Message.recipient_id == current_user.id), so any
# authenticated user — including PARENT/STUDENT with empty permission sets —
# may read their own items. Writes stay permission-gated.
AUTHENTICATED = [Depends(get_current_user)]


def _ensure_notification_prefs(db: Session, user_id: str) -> NotificationPreference:
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


@router.get("/notifications", dependencies=AUTHENTICATED)
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


@router.post("/notifications/{notification_id}/read", dependencies=AUTHENTICATED)
def mark_read(notification_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    communication_service.mark_notification_read(db, notification_id, current_user.id)
    return {"message": "Marked as read"}


@router.post("/notifications/read-all", dependencies=AUTHENTICATED)
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


@router.get("/messages", dependencies=AUTHENTICATED)
def list_messages(
    include_sent: bool = Query(False),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    q = db.query(Message).filter(Message.recipient_id == current_user.id)
    if include_sent:
        q = q.filter((Message.recipient_id == current_user.id) | (Message.sender_id == current_user.id))
    q = q.order_by(Message.created_at.desc())
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


@router.post("/messages/{message_id}/read", dependencies=AUTHENTICATED)
def mark_message_read(message_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    communication_service.mark_message_read(db, message_id, current_user.id)
    return {"message": "Message marked as read"}


@router.get("/notifications/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return _ensure_notification_prefs(db, current_user.id)


@router.put("/notifications/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(data: NotificationPreferenceUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    pref = _ensure_notification_prefs(db, current_user.id)
    if data.email_on is not None:
        pref.email_on = data.email_on
    if data.push_on is not None:
        pref.push_on = data.push_on
    if data.telegram_on is not None:
        pref.telegram_on = data.telegram_on
    if data.sms_on is not None:
        pref.sms_on = data.sms_on
    db.commit()
    db.refresh(pref)
    return pref


# --- Gap N2: FCM/APNs push channel ---------------------------------------
# Feature-gated by FEATURE_PUSH (policy: disabled → reject API calls).
def _require_push_enabled():
    if not settings.feature_push:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Push channel is disabled")


@router.post("/notifications/device-token", response_model=PushDeviceResponse, dependencies=AUTHENTICATED)
def register_device_token(
    data: PushDeviceRegister,
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    _require_push_enabled()
    if not data.token or len(data.token) > 512:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid device token")
    device = (
        db.query(PushDevice)
        .filter(PushDevice.user_id == current_user.id, PushDevice.token == data.token)
        .first()
    )
    if device:
        device.is_active = True
        device.deleted_at = None
        device.platform = data.platform
        db.commit()
        db.refresh(device)
        return device
    device = PushDevice(
        user_id=current_user.id,
        school_id=current_user.school_id,
        platform=data.platform,
        token=data.token,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/notifications/device-tokens", response_model=list[PushDeviceResponse], dependencies=AUTHENTICATED)
def list_device_tokens(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _require_push_enabled()
    return (
        db.query(PushDevice)
        .filter(PushDevice.user_id == current_user.id, PushDevice.deleted_at.is_(None))
        .order_by(PushDevice.created_at.desc())
        .all()
    )


@router.delete("/notifications/device-token/{token}", dependencies=AUTHENTICATED)
def unregister_device_token(token: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _require_push_enabled()
    device = (
        db.query(PushDevice)
        .filter(PushDevice.user_id == current_user.id, PushDevice.token == token)
        .first()
    )
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device token not found")
    device.is_active = False
    device.deleted_at = None
    db.commit()
    return {"message": "Device token unregistered"}
