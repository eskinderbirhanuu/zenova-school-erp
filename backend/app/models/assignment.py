import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=True)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=True)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(String, nullable=True)
    subject_name = Column(String(255), nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending")
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
