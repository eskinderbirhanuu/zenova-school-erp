from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.library import BookCategory, Book, BookBorrowing
from app.core.audit import log_audit


def create_category(db: Session, school_id: str, data, user_id: str):
    c = BookCategory(name=data.name, school_id=school_id)
    db.add(c)
    log_audit(db, user_id, "BOOK_CATEGORY_CREATED", "book_category", c.id, f"Category '{data.name}'")
    db.commit()
    db.refresh(c)
    return c


def get_categories(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(BookCategory).filter(BookCategory.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_book(db: Session, school_id: str, data, user_id: str):
    b = Book(isbn=data.isbn, title=data.title, author=data.author, publisher=data.publisher,
             year=data.year, category_id=data.category_id, total_quantity=data.total_quantity,
             available_quantity=data.total_quantity, shelf_location=data.shelf_location, school_id=school_id)
    db.add(b)
    log_audit(db, user_id, "BOOK_CREATED", "book", b.id, f"Book '{data.title}'")
    db.commit()
    db.refresh(b)
    return b


def update_book(db: Session, book_id: str, data, user_id: str, school_id: str = None):
    q = db.query(Book).filter(Book.id == book_id)
    if school_id:
        q = q.filter(Book.school_id == school_id)
    b = q.first()
    if not b: raise HTTPException(404, "Book not found")
    if data.title is not None: b.title = data.title
    if data.author is not None: b.author = data.author
    if data.total_quantity is not None: b.total_quantity = data.total_quantity
    if data.shelf_location is not None: b.shelf_location = data.shelf_location
    log_audit(db, user_id, "BOOK_UPDATED", "book", book_id, f"Book '{b.title}'")
    db.commit()
    db.refresh(b)
    return b


def get_books(db: Session, school_id: str, category_id: str = None, search: str = None):
    q = db.query(Book).filter(Book.school_id == school_id)
    if category_id: q = q.filter(Book.category_id == category_id)
    if search: q = q.filter(Book.title.ilike(f"%{search}%") | Book.author.ilike(f"%{search}%"))
    return q.order_by(Book.title).all()


def borrow_book(db: Session, school_id: str, data, user_id: str):
    book = db.query(Book).filter(Book.id == data.book_id, Book.school_id == school_id).first()
    if not book: raise HTTPException(404, "Book not found")
    if book.available_quantity < 1: raise HTTPException(400, "No copies available")
    br = BookBorrowing(book_id=data.book_id, borrower_type=data.borrower_type,
                       borrower_id=data.borrower_id, borrow_date=date.today(),
                       due_date=data.due_date, status="borrowed", school_id=school_id, created_by=user_id)
    book.available_quantity -= 1
    db.add(br)
    log_audit(db, user_id, "BOOK_BORROWED", "book_borrowing", br.id, f"Book '{book.title}' borrowed")
    db.commit()
    db.refresh(br)
    return br


def return_book(db: Session, borrowing_id: str, user_id: str, school_id: str = None):
    q = db.query(BookBorrowing).filter(BookBorrowing.id == borrowing_id)
    if school_id:
        q = q.filter(BookBorrowing.school_id == school_id)
    br = q.first()
    if not br: raise HTTPException(404, "Borrowing record not found")
    if br.status == "returned": raise HTTPException(400, "Already returned")
    br.return_date = date.today()
    br.status = "returned"
    q_book = db.query(Book).filter(Book.id == br.book_id)
    if school_id:
        q_book = q_book.filter(Book.school_id == school_id)
    book = q_book.first()
    if book: book.available_quantity += 1
    log_audit(db, user_id, "BOOK_RETURNED", "book_borrowing", borrowing_id, "Book returned")
    db.commit()
    return br


def get_borrowings(db: Session, school_id: str, status: str = None):
    q = db.query(BookBorrowing).filter(BookBorrowing.school_id == school_id)
    if status: q = q.filter(BookBorrowing.status == status)
    return q.order_by(BookBorrowing.created_at.desc()).all()
