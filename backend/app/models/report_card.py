import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base


class ReportCard(Base):
    __tablename__ = "report_cards"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    pdf_url = Column(String(500), nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)


class PromotionRecord(Base):
    __tablename__ = "promotion_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    from_class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    to_class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    promoted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
