import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, DateTime, ForeignKey
from app.database import Base


class Scholarship(Base):
    __tablename__ = "scholarships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    scholarship_type = Column(String(20), nullable=False)
    value = Column(DECIMAL(15, 2), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
