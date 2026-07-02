from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.schemas.event import EventCreate, EventUpdate, EventResponse
from app.services import event_service

router = APIRouter()
ADMIN = [require_role("ADMIN")]
ALL = [require_role("ADMIN", "DIRECTOR", "TEACHER")]


@router.post("", response_model=EventResponse, dependencies=ADMIN)
def create_event(data: EventCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return event_service.create_event(db, data, current_user.school_id, current_user.id)


@router.get("", response_model=list[EventResponse], dependencies=ALL)
def list_events(event_type: str = Query(None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return event_service.get_events(db, current_user.school_id, event_type, include_deleted=include_deleted)


@router.patch("/{event_id}", response_model=EventResponse, dependencies=ADMIN)
def update_event(event_id: str, data: EventUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return event_service.update_event(db, event_id, data, current_user.id, current_user.school_id, include_deleted=True)


@router.delete("/{event_id}", dependencies=ADMIN)
def delete_event(event_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    event_service.delete_event(db, event_id, current_user.id, current_user.school_id, include_deleted=True)
    return {"message": "Event deleted"}
