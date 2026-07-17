import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, DECIMAL, Date, DateTime, ForeignKey, UniqueConstraint
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_number = Column(String(50), nullable=False)
    __table_args__ = (
        UniqueConstraint("school_id", "payment_number", name="uq_payments_school_payment_number"),
    )
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=True, index=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True, index=True)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=True, index=True)
    amount = Column(DECIMAL(15, 2), nullable=False)
    payment_method = Column(String(50), nullable=False)
    reference = Column(String(255), nullable=True)
    idempotency_key = Column(String(255), nullable=True, unique=True)
    currency_code = Column(String(3), default="ETB", nullable=False)
    payment_date = Column(Date, nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    received_by = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
