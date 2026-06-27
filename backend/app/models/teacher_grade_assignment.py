import uuid
from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from app.database import Base


class TeacherGradeAssignment(Base):
    __tablename__ = "teacher_grade_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.id"), nullable=False)
    grade_id = Column(String(36), ForeignKey("classes.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", "grade_id", name="uq_teacher_grade"),
    )
