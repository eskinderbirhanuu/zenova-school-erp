import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(500), nullable=False)
    report_type = Column(String(100), nullable=False)
    module = Column(String(50), nullable=False, index=True)
    period = Column(String(100), nullable=True)
    status = Column(String(20), default="ready")
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
