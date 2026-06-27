import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, ForeignKey
from app.database import Base


class FeeType(Base):
    __tablename__ = "fee_types"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    frequency = Column(String(20), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fee_type_id = Column(String(36), ForeignKey("fee_types.id"), nullable=False)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=True)
    amount = Column(DECIMAL(15, 2), nullable=False)
    due_date = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class FeeAssignment(Base):
    __tablename__ = "fee_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    fee_structure_id = Column(String(36), ForeignKey("fee_structures.id"), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    is_waived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
