import uuid
from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from app.database import Base


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_profile_id = Column(String(36), ForeignKey("teacher_profiles.id"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_profile_id", "subject_id", name="uq_teacher_subject"),
    )
