from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base


class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"

    parent_id = Column(String(36), ForeignKey("parents.id"), primary_key=True)
    student_id = Column(String(36), ForeignKey("students.id"), primary_key=True)
    relationship = Column(String(50), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = orm_relationship("Parent", back_populates="students")
    student = orm_relationship("Student", back_populates="parents")
