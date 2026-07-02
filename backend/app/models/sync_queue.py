import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum as SAEnum
from app.database import Base
import enum


class SyncOperation(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class SyncStatus(str, enum.Enum):
    PENDING = "pending"
    SYNCED = "synced"
    FAILED = "failed"


class SyncQueue(Base):
    __tablename__ = "sync_queue"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(String(36), nullable=False, index=True)
    operation = Column(SAEnum(SyncOperation), nullable=False)
    status = Column(SAEnum(SyncStatus), default=SyncStatus.PENDING, index=True)
    payload = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(String(10), default="0")
    priority = Column(String(10), default="5", index=True)
    source_version = Column(String(20), nullable=True)
    school_id = Column(String(36), nullable=True, index=True)
    branch_id = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
    synced_at = Column(DateTime, nullable=True)
