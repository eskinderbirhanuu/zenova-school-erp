import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Boolean, Date, DateTime, ForeignKey
from app.database import Base


class AccountingPeriod(Base):
    __tablename__ = "accounting_periods"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    is_locked = Column(Boolean, default=False)
    locked_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    locked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
