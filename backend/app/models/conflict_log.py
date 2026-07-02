import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from app.database import Base


class ConflictLog(Base):
    """Records sync conflicts that require manual resolution."""
    __tablename__ = "conflict_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(String(36), nullable=False, index=True)
    local_version = Column(String(20), nullable=True)
    incoming_version = Column(String(20), nullable=True)
    local_data = Column(Text, nullable=True)
    incoming_data = Column(Text, nullable=True)
    source_server_id = Column(String(64), nullable=True)
    resolution = Column(String(20), default="unresolved")
    resolved_by = Column(String(36), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
