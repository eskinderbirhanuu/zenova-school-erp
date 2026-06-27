from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.schemas.library import BookCategoryCreate, BookCategoryResponse, BookCreate, BookUpdate, BookResponse, BorrowingCreate, BorrowingResponse
from app.services import library_service

from app.models.library_member import LibraryMember
from app.models.library_fine import LibraryFine

router = APIRouter()
LIBRARY = [require_role("LIBRARY")]
VIEW_LIBRARY = [require_role("LIBRARY"), require_role("ADMIN")]


@router.post("/library/categories", response_model=BookCategoryResponse, dependencies=LIBRARY)
def create_category(data: BookCategoryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.create_category(db, current_user.school_id, data, current_user.id)


@router.get("/library/categories", response_model=list[BookCategoryResponse], dependencies=VIEW_LIBRARY)
def list_categories(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.get_categories(db, current_user.school_id)


@router.post("/library/books", response_model=BookResponse, dependencies=LIBRARY)
def create_book(data: BookCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.create_book(db, current_user.school_id, data, current_user.id)


@router.patch("/library/books/{book_id}", response_model=BookResponse, dependencies=LIBRARY)
def update_book(book_id: str, data: BookUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.update_book(db, book_id, data, current_user.id)


@router.get("/library/books", response_model=list[BookResponse], dependencies=VIEW_LIBRARY)
def list_books(category_id: str = Query(None), search: str = Query(None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.get_books(db, current_user.school_id, category_id, search)


@router.post("/library/borrowings", response_model=BorrowingResponse, dependencies=LIBRARY)
def borrow_book(data: BorrowingCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.borrow_book(db, current_user.school_id, data, current_user.id)


@router.post("/library/borrowings/{borrowing_id}/return", dependencies=LIBRARY)
def return_book(borrowing_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    library_service.return_book(db, borrowing_id, current_user.id)
    return {"message": "Book returned"}


@router.get("/library/borrowings", response_model=list[BorrowingResponse], dependencies=VIEW_LIBRARY)
def list_borrowings(status: str = Query(None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.get_borrowings(db, current_user.school_id, status)


@router.get("/library/members", dependencies=VIEW_LIBRARY)
def list_members(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
                 db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    members = db.query(LibraryMember).filter(LibraryMember.school_id == current_user.school_id)
    return members.order_by(LibraryMember.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/library/fines", dependencies=VIEW_LIBRARY)
def list_fines(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
               db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    fines = db.query(LibraryFine).filter(LibraryFine.school_id == current_user.school_id)
    return fines.order_by(LibraryFine.created_at.desc()).offset(skip).limit(limit).all()
