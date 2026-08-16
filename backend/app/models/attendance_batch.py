import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from app.database import Base


class AttendanceBatch(Base):
    """Stores the response of a bulk-attendance request keyed by an idempotency
    key so an offline client can replay a queued action safely (Gap T3)."""

    __tablename__ = "attendance_batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    idempotency_key = Column(String(255), nullable=False)
    response = Column(Text, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("school_id", "idempotency_key", name="uq_attendance_batch_key"),
    )
