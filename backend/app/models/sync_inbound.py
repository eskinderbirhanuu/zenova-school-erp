import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text
from app.database import Base


class SyncInbound(Base):
    """Tracks received sync payloads from peer servers for deduplication."""
    __tablename__ = "sync_inbound"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_server_id = Column(String(64), nullable=False, index=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(36), nullable=False)
    operation = Column(String(20), nullable=False)
    payload_hash = Column(String(64), nullable=False, index=True)
    payload = Column(Text, nullable=True)
    applied = Column(Boolean, default=False)
    source_version = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
