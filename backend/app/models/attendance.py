import uuid
from datetime import datetime, timezone, date, time
from sqlalchemy import Column, String, Date, Time, DateTime, ForeignKey
from app.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    staff_profile_id = Column(String(36), ForeignKey("staff_profiles.id"), nullable=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True)
    date = Column(Date, nullable=False)
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    status = Column(String(20), default="present", comment="present, absent, late, excused")
    reason = Column(String(500), nullable=True, comment="Reason for absence/late/excused")
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    marked_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
