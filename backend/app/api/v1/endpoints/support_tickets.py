from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.schemas.support_ticket import SupportTicketCreate, SupportTicketUpdate, SupportTicketResponse
from app.services import support_ticket_service
from app.models.user import User

router = APIRouter()
SUPER_ADMIN = [require_permission(Permission.LICENSE_MANAGE)]


@router.post("/support/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(data: SupportTicketCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = support_ticket_service.create_ticket(db, data, current_user.id, current_user.school_id)
    assigned_name = None
    if ticket.assigned_to:
        u = db.query(User).filter(User.id == ticket.assigned_to).first()
        if u:
            assigned_name = u.full_name
    return SupportTicketResponse(
        id=ticket.id, ticket_number=ticket.ticket_number,
        school_id=ticket.school_id, school_name=ticket.school_name,
        subject=ticket.subject, description=ticket.description,
        priority=ticket.priority, status=ticket.status,
        assigned_to=ticket.assigned_to, assigned_name=assigned_name,
        created_by=ticket.created_by, created_at=ticket.created_at, updated_at=ticket.updated_at,
    )


@router.get("/support/tickets", response_model=list[SupportTicketResponse], dependencies=SUPER_ADMIN)
def list_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str = Query(None),
    priority: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return support_ticket_service.list_tickets(db, skip, limit, status, priority, include_deleted=True)



@router.get("/support/tickets/counts", dependencies=SUPER_ADMIN)
def ticket_counts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return support_ticket_service.get_ticket_counts(db, include_deleted=True)

@router.get("/support/tickets/{ticket_id}", response_model=SupportTicketResponse, dependencies=SUPER_ADMIN)
def get_ticket(ticket_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = support_ticket_service.get_ticket(db, ticket_id, include_deleted=True)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.patch("/support/tickets/{ticket_id}", response_model=SupportTicketResponse, dependencies=SUPER_ADMIN)
def update_ticket(ticket_id: str, data: SupportTicketUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = support_ticket_service.update_ticket(db, ticket_id, data, include_deleted=True)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket
