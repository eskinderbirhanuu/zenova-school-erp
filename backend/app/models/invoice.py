import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, DECIMAL, Date, DateTime, ForeignKey
from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String(50), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    total_amount = Column(DECIMAL(15, 2), nullable=False)
    paid_amount = Column(DECIMAL(15, 2), default=0.00)
    status = Column(String(20), default="draft")
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False)
    fee_assignment_id = Column(String(36), ForeignKey("fee_assignments.id"), nullable=True)
    description = Column(String(500), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
