"""Refund model for payment refunds."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, DateTime, ForeignKey, Text
from app.database import Base


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    refund_number = Column(String(50), nullable=False, unique=True, index=True)

    # References
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=False)
    receipt_id = Column(String(36), ForeignKey("receipts.id"), nullable=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)

    # Refund details
    amount = Column(DECIMAL(15, 2), nullable=False)
    reason = Column(Text, nullable=False)
    refund_method = Column(String(50), nullable=False)  # original, cash, bank

    # Approval workflow
    status = Column(String(20), default="pending")  # pending, approved, rejected, processed
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Processing
    processed_at = Column(DateTime, nullable=True)
    processed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    transaction_reference = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
