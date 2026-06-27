import uuid
from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from app.database import Base


class TeacherSectionAssignment(Base):
    __tablename__ = "teacher_section_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.id"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", "section_id", name="uq_teacher_section"),
    )
