import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, DECIMAL, Date, DateTime, ForeignKey, Text
from app.database import Base


class EmployeeContract(Base):
    __tablename__ = "employee_contracts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    staff_profile_id = Column(String(36), ForeignKey("staff_profiles.id"), nullable=False)
    contract_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    position = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    basic_salary = Column(DECIMAL(15, 2), nullable=False)
    status = Column(String(20), default="active")
    notes = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
