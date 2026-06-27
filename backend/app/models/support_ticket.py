import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from app.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(String(20), unique=True, nullable=False, index=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    school_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), default="Medium")
    status = Column(String(20), default="Open")
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
