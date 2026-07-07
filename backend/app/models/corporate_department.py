import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey
from app.database import Base


class CorporateDepartment(Base):
    __tablename__ = "corporate_departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    head_employee_id = Column(String(36), ForeignKey("corporate_employees.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
