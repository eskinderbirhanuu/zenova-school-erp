import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Integer, DECIMAL, Text, Date, DateTime, ForeignKey
from app.database import Base


class BookCategory(Base):
    __tablename__ = "book_categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Book(Base):
    __tablename__ = "books"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    isbn = Column(String(100), nullable=True)
    title = Column(String(500), nullable=False)
    author = Column(String(500), nullable=True)
    publisher = Column(String(255), nullable=True)
    year = Column(Integer, nullable=True)
    category_id = Column(String(36), ForeignKey("book_categories.id"), nullable=True)
    total_quantity = Column(Integer, default=1)
    available_quantity = Column(Integer, default=1)
    shelf_location = Column(String(100), nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class BookBorrowing(Base):
    __tablename__ = "book_borrowings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    book_id = Column(String(36), ForeignKey("books.id"), nullable=False)
    borrower_type = Column(String(20), nullable=False)
    borrower_id = Column(String(36), nullable=False)
    borrow_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    status = Column(String(20), default="borrowed")
    fine_amount = Column(DECIMAL(10, 2), default=0.00)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
