import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, DECIMAL
from app.database import Base


class ExamType(Base):
    __tablename__ = "exam_types"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    weight = Column(DECIMAL(5, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Exam(Base):
    __tablename__ = "exams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    exam_type_id = Column(String(36), ForeignKey("exam_types.id"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=True)
    exam_date = Column(Date, nullable=True)
    max_score = Column(DECIMAL(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ExamResult(Base):
    __tablename__ = "exam_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String(36), ForeignKey("exams.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    score = Column(DECIMAL(10, 2), nullable=False)
    grade = Column(String(10), nullable=True)
    remarks = Column(String(500), nullable=True)
    entered_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
