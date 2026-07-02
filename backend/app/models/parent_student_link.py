from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base


class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"

    parent_id = Column(String(36), ForeignKey("parents.id"), primary_key=True)
    student_id = Column(String(36), ForeignKey("students.id"), primary_key=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True, index=True)
    relationship = Column(String(50), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    parent = orm_relationship("Parent", back_populates="students")
    student = orm_relationship("Student", back_populates="parents")
