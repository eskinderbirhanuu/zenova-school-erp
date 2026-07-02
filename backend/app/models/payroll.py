import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, DECIMAL, Date, DateTime, ForeignKey
from app.database import Base


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    status = Column(String(20), default="draft")
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)


class PayrollItem(Base):
    __tablename__ = "payroll_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payroll_run_id = Column(String(36), ForeignKey("payroll_runs.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    employee_id = Column(String(36), ForeignKey("staff_profiles.id"), nullable=False)
    basic_salary = Column(DECIMAL(15, 2), default=0.00)
    allowances = Column(DECIMAL(15, 2), default=0.00)
    bonuses = Column(DECIMAL(15, 2), default=0.00)
    overtime = Column(DECIMAL(15, 2), default=0.00)
    tax = Column(DECIMAL(15, 2), default=0.00)
    pension = Column(DECIMAL(15, 2), default=0.00)
    loan_deduction = Column(DECIMAL(15, 2), default=0.00)
    net_pay = Column(DECIMAL(15, 2), default=0.00)
    deleted_at = Column(DateTime, nullable=True)
