import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DECIMAL, DateTime, ForeignKey, Text
from app.database import Base


class PlatformFee(Base):
    __tablename__ = "platform_fees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    transaction_id = Column(String(36), ForeignKey("school_transactions.id"), nullable=False)
    fee_amount = Column(DECIMAL(15, 2), nullable=False)
    status = Column(String(20), default="pending", index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    paid_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
