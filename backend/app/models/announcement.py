from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from app.database import Base
import uuid
from datetime import datetime, timezone


class Announcement(Base):
    __tablename__ = "school_announcements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    target_roles = Column(String(500), nullable=True)
    is_published = Column(Boolean, default=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
