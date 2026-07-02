from sqlalchemy.orm import Session
from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.models.school import School


def generate_ticket_number(db: Session, include_deleted: bool = False) -> str:
    q = db.query(SupportTicket).order_by(SupportTicket.created_at.desc())
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    last = q.first()
    num = 1
    if last and last.ticket_number.startswith("TKT-"):
        try:
            num = int(last.ticket_number.split("-")[1]) + 1
        except (IndexError, ValueError):
            num = 1
    return f"TKT-{num:03d}"


def create_ticket(db: Session, data, user_id: str, school_id: str = None):
    ticket = SupportTicket(
        ticket_number=generate_ticket_number(db),
        school_id=school_id or data.school_id,
        school_name=data.school_name,
        subject=data.subject,
        description=data.description,
        priority=data.priority,
        status="Open",
        created_by=user_id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def list_tickets(db: Session, skip: int = 0, limit: int = 50, status: str = None, priority: str = None, include_deleted: bool = False):
    q = db.query(SupportTicket).order_by(SupportTicket.created_at.desc())
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if status:
        q = q.filter(SupportTicket.status == status)
    if priority:
        q = q.filter(SupportTicket.priority == priority)
    tickets = q.offset(skip).limit(limit).all()
    result = []
    for t in tickets:
        assigned_name = None
        if t.assigned_to:
            u = db.query(User).filter(User.id == t.assigned_to).execution_options(include_deleted=True).first()
            if u:
                assigned_name = u.full_name
        result.append({
            "id": t.id,
            "ticket_number": t.ticket_number,
            "school_id": t.school_id,
            "school_name": t.school_name,
            "subject": t.subject,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "assigned_to": t.assigned_to,
            "assigned_name": assigned_name,
            "created_by": t.created_by,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        })
    return result


def get_ticket(db: Session, ticket_id: str, include_deleted: bool = False):
    q = db.query(SupportTicket).filter(SupportTicket.id == ticket_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    t = q.first()
    if not t:
        return None
    assigned_name = None
    if t.assigned_to:
        u = db.query(User).filter(User.id == t.assigned_to).execution_options(include_deleted=True).first()
        if u:
            assigned_name = u.full_name
    return {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "school_id": t.school_id,
        "school_name": t.school_name,
        "subject": t.subject,
        "description": t.description,
        "priority": t.priority,
        "status": t.status,
        "assigned_to": t.assigned_to,
        "assigned_name": assigned_name,
        "created_by": t.created_by,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


def update_ticket(db: Session, ticket_id: str, data, include_deleted: bool = False):
    q = db.query(SupportTicket).filter(SupportTicket.id == ticket_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    t = q.first()
    if not t:
        return None
    if data.status is not None:
        t.status = data.status
    if data.priority is not None:
        t.priority = data.priority
    if data.assigned_to is not None:
        t.assigned_to = data.assigned_to
    db.commit()
    db.refresh(t)
    return get_ticket(db, ticket_id, include_deleted=include_deleted)


def get_ticket_counts(db: Session, include_deleted: bool = False):
    q = db.query(SupportTicket)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    total = q.count()
    open_ = q.filter(SupportTicket.status == "Open").count()
    in_progress = q.filter(SupportTicket.status == "In Progress").count()
    resolved = q.filter(SupportTicket.status == "Resolved").count()
    return {"total": total, "open": open_, "in_progress": in_progress, "resolved": resolved}
