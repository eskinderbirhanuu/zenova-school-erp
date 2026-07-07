"""DEPRECATED — Use v2 per-entity card models instead:
- StudentCard (student_cards)
- StaffCard (staff_cards)
- ParentCard (parent_cards)
- EmployeeCard (employee_cards)

This polymorphic table (nfc_cards) will be removed in a future release.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base


class NFCCard(Base):
    __tablename__ = "nfc_cards"
    """DEPRECATED: use per-entity card models (StudentCard, StaffCard, etc.)."""

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    card_uid = Column(String(100), unique=True, nullable=False, index=True)
    reference_type = Column(String(50), nullable=False)
    reference_id = Column(String(36), nullable=False)
    issue_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expiry_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    assigned_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
