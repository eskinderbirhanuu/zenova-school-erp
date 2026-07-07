import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DECIMAL, DateTime, ForeignKey
from app.database import Base


class MonthlyPlatformInvoice(Base):
    __tablename__ = "monthly_platform_invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    transaction_count = Column(Integer, nullable=False, default=0)
    total_amount = Column(DECIMAL(15, 2), nullable=False)
    status = Column(String(20), default="pending", index=True)
    invoice_number = Column(String(50), nullable=False, unique=True)
    payment_reference = Column(String(255), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
