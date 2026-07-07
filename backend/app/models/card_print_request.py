import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.database import Base


class CardPrintRequest(Base):
    __tablename__ = "card_print_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    card_type = Column(String(20), nullable=False)
    reference_id = Column(String(36), nullable=False)
    status = Column(String(20), default="pending")
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    printed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
