"""School monitoring endpoints — receive health reports from local servers."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import MonitoringEvent, School
from app.schemas import MonitoringReport

router = APIRouter()


@router.post("/report")
def report_monitoring(data: MonitoringReport, db: Session = Depends(get_db)):
    event = MonitoringEvent(
        school_id=data.school_id,
        event_type=data.event_type,
        payload=data.payload,
        reported_at=datetime.now(timezone.utc),
    )
    db.add(event)
    # Update school last_sync_at
    db.query(School).filter(School.id == data.school_id).update(
        {"last_sync_at": datetime.now(timezone.utc)}
    )
    db.commit()
    return {"status": "received"}


@router.get("/dashboard")
def monitoring_dashboard(db: Session = Depends(get_db)):
    total_schools = db.query(School).count()
    active_schools = db.query(School).filter(School.is_active == True).count()
    recent_events = db.query(MonitoringEvent).order_by(
        MonitoringEvent.reported_at.desc()
    ).limit(50).all()

    return {
        "total_schools": total_schools,
        "active_schools": active_schools,
        "recent_events": [
            {
                "school_id": e.school_id,
                "event_type": e.event_type,
                "reported_at": e.reported_at.isoformat(),
            }
            for e in recent_events
        ],
    }


@router.get("/school/{school_id}")
def school_monitoring(school_id: str, db: Session = Depends(get_db)):
    events = db.query(MonitoringEvent).filter(
        MonitoringEvent.school_id == school_id
    ).order_by(MonitoringEvent.reported_at.desc()).limit(20).all()

    return {
        "school_id": school_id,
        "events": [
            {
                "event_type": e.event_type,
                "payload": e.payload,
                "reported_at": e.reported_at.isoformat(),
            }
            for e in events
        ],
        "total": len(events),
    }
