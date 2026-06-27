from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.communication import Announcement, Notification, Message
from app.models.user import User
from app.core.audit import log_audit


def create_announcement(db: Session, school_id: str, data, user_id: str):
    a = Announcement(title=data.title, message=data.message, target_roles=data.target_roles,
                     priority=data.priority, school_id=school_id, created_by=user_id)
    db.add(a); db.commit(); db.refresh(a)
    log_audit(db, user_id, "ANNOUNCEMENT_CREATED", "announcement", a.id, f"'{data.title}'")
    return a


def get_announcements(db: Session, school_id: str):
    return db.query(Announcement).filter(Announcement.school_id == school_id).order_by(Announcement.created_at.desc()).all()


def get_notifications(db: Session, user_id: str, unread_only: bool = False):
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only: q = q.filter(Notification.is_read == False)
    return q.order_by(Notification.created_at.desc()).limit(50).all()


def mark_notification_read(db: Session, notification_id: str, user_id: str):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not n: raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return n


def mark_all_read(db: Session, user_id: str):
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()


def send_notification(db: Session, user_id: str, title: str, message: str = None,
                      notification_type: str = None, reference_type: str = None, reference_id: str = None):
    n = Notification(user_id=user_id, title=title, message=message,
                     notification_type=notification_type, reference_type=reference_type, reference_id=reference_id)
    db.add(n); db.commit(); db.refresh(n)
    try:
        from app.services.notification_manager import notification_manager
        import asyncio
        asyncio.ensure_future(notification_manager.push(user_id, {
            "id": n.id, "title": n.title, "message": n.message,
            "notification_type": n.notification_type, "is_read": n.is_read,
            "created_at": str(n.created_at),
        }))
    except Exception:
        pass
    return n


def send_message(db: Session, sender_id: str, recipient_id: str, subject: str, message: str, school_id: str):
    m = Message(sender_id=sender_id, recipient_id=recipient_id, subject=subject,
                message=message, school_id=school_id)
    db.add(m)
    n = Notification(user_id=recipient_id, title=subject, message=message,
                     notification_type="message", reference_type="message", reference_id=m.id)
    db.add(n)
    db.commit()
    db.refresh(m)
    return m


def get_messages(db: Session, user_id: str, include_sent: bool = False):
    q = db.query(Message).filter(
        (Message.recipient_id == user_id) | (Message.sender_id == user_id) if include_sent else (Message.recipient_id == user_id)
    )
    messages = q.order_by(Message.created_at.desc()).limit(50).all()
    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append({
            "id": m.id, "sender_id": m.sender_id, "recipient_id": m.recipient_id,
            "subject": m.subject, "message": m.message, "is_read": m.is_read,
            "read_at": m.read_at, "sender_name": sender.full_name if sender else None,
            "created_at": m.created_at,
        })
    return result


def mark_message_read(db: Session, message_id: str, user_id: str):
    m = db.query(Message).filter(Message.id == message_id, Message.recipient_id == user_id).first()
    if not m:
        raise HTTPException(404, "Message not found")
    m.is_read = True
    from datetime import datetime, timezone
    m.read_at = datetime.now(timezone.utc)
    db.commit()
    return m
