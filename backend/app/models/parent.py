import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base


class Parent(Base):
    __tablename__ = "parents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id = Column(String(50), unique=True, nullable=True, index=True)
    full_name = Column(String(255), nullable=False)
    relationship = Column(String(50), nullable=True)
    phone_1 = Column(String(50), nullable=False)
    phone_2 = Column(String(50), nullable=True)
    occupation = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    national_id = Column(String(100), nullable=True)
    passport_id = Column(String(100), nullable=True)
    kebele_id = Column(String(100), nullable=True)
    photo_url = Column(String(500), nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    students = orm_relationship("ParentStudentLink", back_populates="parent")
