from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.event import Event
from app.core.audit import log_audit


def create_event(db: Session, data, school_id: str, user_id: str):
    ev = Event(title=data.title, description=data.description, event_type=data.event_type,
               event_date=data.event_date, end_date=data.end_date, location=data.location,
               school_id=school_id, created_by=user_id)
    db.add(ev)
    log_audit(db, user_id, "CREATE", "event", ev.id, f"Event '{data.title}'")
    db.commit()
    db.refresh(ev)
    return ev


def update_event(db: Session, event_id: str, data, user_id: str, school_id: str = None, include_deleted: bool = False):
    q = db.query(Event).filter(Event.id == event_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(Event.school_id == school_id)
    ev = q.first()
    if not ev: raise HTTPException(404, "Event not found")
    for field in ["title", "description", "event_type", "event_date", "end_date", "location"]:
        if getattr(data, field, None) is not None:
            setattr(ev, field, getattr(data, field))
    log_audit(db, user_id, "UPDATE", "event", ev.id, f"Event '{ev.title}' updated")
    db.commit()
    db.refresh(ev)
    return ev


def get_events(db: Session, school_id: str, event_type: str = None, include_deleted: bool = False):
    q = db.query(Event).filter(Event.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if event_type: q = q.filter(Event.event_type == event_type)
    return q.order_by(Event.event_date.desc()).all()


def delete_event(db: Session, event_id: str, user_id: str, school_id: str = None, include_deleted: bool = False):
    q = db.query(Event).filter(Event.id == event_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(Event.school_id == school_id)
    ev = q.first()
    if not ev: raise HTTPException(404, "Event not found")
    ev.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "DELETE", "event", ev.id, f"Event '{ev.title}' deleted")
    db.commit()
