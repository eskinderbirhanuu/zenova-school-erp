from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.event import Event
from app.core.audit import log_audit


def create_event(db: Session, data, school_id: str, user_id: str):
    ev = Event(title=data.title, description=data.description, event_type=data.event_type,
               event_date=data.event_date, end_date=data.end_date, location=data.location,
               school_id=school_id, created_by=user_id)
    db.add(ev); db.commit(); db.refresh(ev)
    log_audit(db, user_id, "CREATE", "event", ev.id, f"Event '{data.title}'")
    return ev


def update_event(db: Session, event_id: str, data, user_id: str):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev: raise HTTPException(404, "Event not found")
    for field in ["title", "description", "event_type", "event_date", "end_date", "location"]:
        if getattr(data, field, None) is not None:
            setattr(ev, field, getattr(data, field))
    db.commit(); db.refresh(ev)
    log_audit(db, user_id, "UPDATE", "event", ev.id, f"Event '{ev.title}' updated")
    return ev


def get_events(db: Session, school_id: str, event_type: str = None):
    q = db.query(Event).filter(Event.school_id == school_id)
    if event_type: q = q.filter(Event.event_type == event_type)
    return q.order_by(Event.event_date.desc()).all()


def delete_event(db: Session, event_id: str, user_id: str):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev: raise HTTPException(404, "Event not found")
    db.delete(ev); db.commit()
    log_audit(db, user_id, "DELETE", "event", ev.id, f"Event '{ev.title}' deleted")
