"""Payment session for tracking online payments."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DECIMAL, DateTime, ForeignKey, Text
from app.database import Base


class PaymentSession(Base):
    __tablename__ = "payment_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(100), nullable=False, unique=True, index=True)

    # References
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)

    # Payment details
    amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), default="ETB")
    payment_method = Column(String(50), nullable=False)

    # Gateway details
    gateway = Column(String(50), nullable=False)  # LPesa, Chapa, CBE, etc.
    gateway_reference = Column(String(255), nullable=True)
    gateway_response = Column(Text, nullable=True)  # JSON response

    # Status tracking
    status = Column(String(20), default="pending")  # pending, processing, completed, failed, cancelled, refunded

    # Webhook tracking
    webhook_received = Column(DateTime, nullable=True)
    webhook_payload = Column(Text, nullable=True)
    webhook_verified = Column(DateTime, nullable=True)
    webhook_retry_count = Column(Integer, default=0)
    webhook_last_error = Column(String(500), nullable=True)
    webhook_next_retry = Column(DateTime, nullable=True)

    # Timestamps
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
