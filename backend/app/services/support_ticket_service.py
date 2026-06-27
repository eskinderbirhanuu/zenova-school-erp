from sqlalchemy.orm import Session
from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.models.school import School


def generate_ticket_number(db: Session) -> str:
    last = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).first()
    num = 1
    if last and last.ticket_number.startswith("TKT-"):
        try:
            num = int(last.ticket_number.split("-")[1]) + 1
        except (IndexError, ValueError):
            num = 1
    return f"TKT-{num:03d}"


def create_ticket(db: Session, data, user_id: str):
    ticket = SupportTicket(
        ticket_number=generate_ticket_number(db),
        school_id=data.school_id,
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


def list_tickets(db: Session, skip: int = 0, limit: int = 50, status: str = None, priority: str = None):
    q = db.query(SupportTicket).order_by(SupportTicket.created_at.desc())
    if status:
        q = q.filter(SupportTicket.status == status)
    if priority:
        q = q.filter(SupportTicket.priority == priority)
    tickets = q.offset(skip).limit(limit).all()
    result = []
    for t in tickets:
        assigned_name = None
        if t.assigned_to:
            u = db.query(User).filter(User.id == t.assigned_to).first()
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


def get_ticket(db: Session, ticket_id: str):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        return None
    assigned_name = None
    if t.assigned_to:
        u = db.query(User).filter(User.id == t.assigned_to).first()
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


def update_ticket(db: Session, ticket_id: str, data):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
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
    return get_ticket(db, ticket_id)


def get_ticket_counts(db: Session):
    total = db.query(SupportTicket).count()
    open_ = db.query(SupportTicket).filter(SupportTicket.status == "Open").count()
    in_progress = db.query(SupportTicket).filter(SupportTicket.status == "In Progress").count()
    resolved = db.query(SupportTicket).filter(SupportTicket.status == "Resolved").count()
    return {"total": total, "open": open_, "in_progress": in_progress, "resolved": resolved}
