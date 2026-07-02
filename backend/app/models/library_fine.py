import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from app.database import Base


class LibraryFine(Base):
    __tablename__ = "library_fines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    borrowing_id = Column(String(36), ForeignKey("book_borrowings.id"), nullable=True)
    member_name = Column(String(255), nullable=True)
    book_title = Column(String(255), nullable=True)
    days_overdue = Column(Integer, default=0)
    amount = Column(Float, default=0)
    status = Column(String(20), default="unpaid")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
