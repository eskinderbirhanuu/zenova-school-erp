import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from app.database import Base


class TeacherSectionAssignment(Base):
    __tablename__ = "teacher_section_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.id"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("teacher_id", "section_id", name="uq_teacher_section"),
    )
