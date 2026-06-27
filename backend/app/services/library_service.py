from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.library import BookCategory, Book, BookBorrowing
from app.core.audit import log_audit


def create_category(db: Session, school_id: str, data, user_id: str):
    c = BookCategory(name=data.name, school_id=school_id)
    db.add(c); db.commit(); db.refresh(c)
    log_audit(db, user_id, "BOOK_CATEGORY_CREATED", "book_category", c.id, f"Category '{data.name}'")
    return c


def get_categories(db: Session, school_id: str):
    return db.query(BookCategory).filter(BookCategory.school_id == school_id).all()


def create_book(db: Session, school_id: str, data, user_id: str):
    b = Book(isbn=data.isbn, title=data.title, author=data.author, publisher=data.publisher,
             year=data.year, category_id=data.category_id, total_quantity=data.total_quantity,
             available_quantity=data.total_quantity, shelf_location=data.shelf_location, school_id=school_id)
    db.add(b); db.commit(); db.refresh(b)
    log_audit(db, user_id, "BOOK_CREATED", "book", b.id, f"Book '{data.title}'")
    return b


def update_book(db: Session, book_id: str, data, user_id: str):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b: raise HTTPException(404, "Book not found")
    if data.title is not None: b.title = data.title
    if data.author is not None: b.author = data.author
    if data.total_quantity is not None: b.total_quantity = data.total_quantity
    if data.shelf_location is not None: b.shelf_location = data.shelf_location
    db.commit(); db.refresh(b)
    log_audit(db, user_id, "BOOK_UPDATED", "book", book_id, f"Book '{b.title}'")
    return b


def get_books(db: Session, school_id: str, category_id: str = None, search: str = None):
    q = db.query(Book).filter(Book.school_id == school_id)
    if category_id: q = q.filter(Book.category_id == category_id)
    if search: q = q.filter(Book.title.ilike(f"%{search}%") | Book.author.ilike(f"%{search}%"))
    return q.order_by(Book.title).all()


def borrow_book(db: Session, school_id: str, data, user_id: str):
    book = db.query(Book).filter(Book.id == data.book_id).first()
    if not book: raise HTTPException(404, "Book not found")
    if book.available_quantity < 1: raise HTTPException(400, "No copies available")
    br = BookBorrowing(book_id=data.book_id, borrower_type=data.borrower_type,
                       borrower_id=data.borrower_id, borrow_date=date.today(),
                       due_date=data.due_date, status="borrowed", school_id=school_id, created_by=user_id)
    book.available_quantity -= 1
    db.add(br); db.commit(); db.refresh(br)
    log_audit(db, user_id, "BOOK_BORROWED", "book_borrowing", br.id, f"Book '{book.title}' borrowed")
    return br


def return_book(db: Session, borrowing_id: str, user_id: str):
    br = db.query(BookBorrowing).filter(BookBorrowing.id == borrowing_id).first()
    if not br: raise HTTPException(404, "Borrowing record not found")
    if br.status == "returned": raise HTTPException(400, "Already returned")
    br.return_date = date.today()
    br.status = "returned"
    book = db.query(Book).filter(Book.id == br.book_id).first()
    if book: book.available_quantity += 1
    db.commit()
    log_audit(db, user_id, "BOOK_RETURNED", "book_borrowing", borrowing_id, "Book returned")
    return br


def get_borrowings(db: Session, school_id: str, status: str = None):
    q = db.query(BookBorrowing).filter(BookBorrowing.school_id == school_id)
    if status: q = q.filter(BookBorrowing.status == status)
    return q.order_by(BookBorrowing.created_at.desc()).all()
