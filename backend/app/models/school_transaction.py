import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, DateTime, ForeignKey
from app.database import Base


class SchoolTransaction(Base):
    __tablename__ = "school_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=True)
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=True)
    payment_method = Column(String(50), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    transaction_reference = Column(String(255), nullable=True)
    payment_date = Column(DateTime, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
