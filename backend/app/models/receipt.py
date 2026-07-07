"""Receipt model for payment confirmations."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, DateTime, ForeignKey, Text
from app.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receipt_number = Column(String(50), nullable=False, unique=True, index=True)
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=False)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)

    # Payment details
    amount_paid = Column(DECIMAL(15, 2), nullable=False)
    payment_method = Column(String(50), nullable=False)
    payment_date = Column(DateTime, nullable=False)
    transaction_id = Column(String(255), nullable=True)
    reference_number = Column(String(255), nullable=True)

    # Receipt metadata
    cashier_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    qr_code_data = Column(Text, nullable=True)  # Base64 encoded QR

    # Status
    status = Column(String(20), default="active")  # active, cancelled, refunded

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)


class ReceiptLine(Base):
    __tablename__ = "receipt_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receipt_id = Column(String(36), ForeignKey("receipts.id"), nullable=False)
    invoice_line_id = Column(String(36), ForeignKey("invoice_lines.id"), nullable=True)
    description = Column(String(500), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
