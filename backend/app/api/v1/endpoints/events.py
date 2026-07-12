from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.core.pagination import paginate, build_paginated_response
from app.schemas.event import EventCreate, EventUpdate, EventResponse
from app.models.event import Event
from app.services import event_service

router = APIRouter()
ADMIN = [require_permission(Permission.SETTINGS_MANAGE)]
ALL = [require_permission(Permission.STUDENT_VIEW)]


@router.post("", response_model=EventResponse, dependencies=ADMIN)
def create_event(data: EventCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return event_service.create_event(db, data, current_user.school_id, current_user.id)


@router.get("", dependencies=ALL)
def list_events(
    event_type: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(Event).filter(Event.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if event_type:
        q = q.filter(Event.event_type == event_type)
    q = q.order_by(Event.event_date.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[EventResponse.model_validate(e) for e in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.patch("/{event_id}", response_model=EventResponse, dependencies=ADMIN)
def update_event(event_id: str, data: EventUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return event_service.update_event(db, event_id, data, current_user.id, current_user.school_id, include_deleted=True)


@router.delete("/{event_id}", dependencies=ADMIN)
def delete_event(event_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    event_service.delete_event(db, event_id, current_user.id, current_user.school_id, include_deleted=True)
    return {"message": "Event deleted"}
