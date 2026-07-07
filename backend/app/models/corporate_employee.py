import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class CorporateEmployee(Base):
    __tablename__ = "corporate_employees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    department_id = Column(String(36), ForeignKey("corporate_departments.id"), nullable=True)
    position = Column(String(100), nullable=True)
    status = Column(String(20), default="active")
    photo_url = Column(String(500), nullable=True)
    employment_date = Column(Date, nullable=True)
    employment_type = Column(String(20), default="full-time")
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    department = relationship("CorporateDepartment", foreign_keys=[department_id])
