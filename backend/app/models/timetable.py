import uuid
from datetime import datetime, time, timezone
from sqlalchemy import Column, String, Integer, Time, DateTime, ForeignKey
from app.database import Base


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teacher_profiles.id"), nullable=True)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
