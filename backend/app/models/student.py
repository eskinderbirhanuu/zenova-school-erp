import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(50), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    grade_id = Column(String(36), ForeignKey("classes.id"), nullable=True)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=True)
    address = Column(Text, nullable=True)
    nationality = Column(String(100), nullable=True)
    stream = Column(String(100), nullable=True)
    medical_notes = Column(String(500), nullable=True)
    blood_group = Column(String(10), nullable=True)
    photo_url = Column(String(500), nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    admission_date = Column(Date, nullable=False)
    status = Column(String(20), default="active")
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    registered_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    parents = relationship("ParentStudentLink", back_populates="student")
