import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, ForeignKey
from app.database import Base


class ArchiveJob(Base):
    __tablename__ = "archive_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    table_name = Column(String(100), nullable=False, index=True)
    cutoff_date = Column(DateTime, nullable=False)
    total_candidates = Column(Integer, default=0)
    archived_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    status = Column(String(20), default="running")
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    created_by = Column(String(36), nullable=True)


class ArchivedRecord(Base):
    __tablename__ = "archived_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("archive_jobs.id"), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(String(36), nullable=False, index=True)
    school_id = Column(String(36), nullable=True, index=True)
    data = Column(JSON, nullable=False)
    archived_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
