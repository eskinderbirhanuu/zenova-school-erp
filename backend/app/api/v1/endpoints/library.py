from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.schemas.library import BookCategoryCreate, BookCategoryResponse, BookCreate, BookUpdate, BookResponse, BorrowingCreate, BorrowingResponse
from app.schemas.pagination import PaginatedResponse
from app.core.pagination import paginate, build_paginated_response
from app.services import library_service
from app.models.library import Book

from app.models.library_member import LibraryMember
from app.models.library_fine import LibraryFine

router = APIRouter()
LIBRARY = [require_permission(Permission.LIBRARY_MANAGE)]
VIEW_LIBRARY = [require_permission(Permission.LIBRARY_MANAGE)]


@router.post("/library/categories", response_model=BookCategoryResponse, dependencies=LIBRARY)
def create_category(data: BookCategoryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.create_category(db, current_user.school_id, data, current_user.id)


@router.get("/library/categories", response_model=list[BookCategoryResponse], dependencies=VIEW_LIBRARY)
def list_categories(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return library_service.get_categories(db, current_user.school_id, include_deleted=include_deleted)


@router.post("/library/books", response_model=BookResponse, dependencies=LIBRARY)
def create_book(data: BookCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.create_book(db, current_user.school_id, data, current_user.id)


@router.patch("/library/books/{book_id}", response_model=BookResponse, dependencies=LIBRARY)
def update_book(book_id: str, data: BookUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.update_book(db, book_id, data, current_user.id, current_user.school_id)


@router.get("/library/books", dependencies=VIEW_LIBRARY)
def list_books(
    category_id: str = Query(None), search: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    q = db.query(Book).filter(Book.school_id == current_user.school_id)
    if category_id:
        q = q.filter(Book.category_id == category_id)
    if search:
        q = q.filter(Book.title.ilike(f"%{search}%") | Book.author.ilike(f"%{search}%"))
    q = q.order_by(Book.title)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[BookResponse.model_validate(b) for b in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/library/borrowings", response_model=BorrowingResponse, dependencies=LIBRARY)
def borrow_book(data: BorrowingCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return library_service.borrow_book(db, current_user.school_id, data, current_user.id)


@router.post("/library/borrowings/{borrowing_id}/return", dependencies=LIBRARY)
def return_book(borrowing_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    library_service.return_book(db, borrowing_id, current_user.id, current_user.school_id)
    return {"message": "Book returned"}


@router.get("/library/borrowings", dependencies=VIEW_LIBRARY)
def list_borrowings(
    status: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    from app.models.library import BookBorrowing
    q = db.query(BookBorrowing).filter(BookBorrowing.school_id == current_user.school_id)
    if status:
        q = q.filter(BookBorrowing.status == status)
    q = q.order_by(BookBorrowing.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[BorrowingResponse.model_validate(b) for b in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.get("/library/members", dependencies=VIEW_LIBRARY)
def list_members(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    q = db.query(LibraryMember).filter(LibraryMember.school_id == current_user.school_id)
    if current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN')):
        q = q.execution_options(include_deleted=True)
    q = q.order_by(LibraryMember.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[{"id": str(m.id), "name": m.name, "email": m.email, "phone": m.phone, "status": m.status, "created_at": m.created_at.isoformat() if m.created_at else None} for m in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.get("/library/fines", dependencies=VIEW_LIBRARY)
def list_fines(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    q = db.query(LibraryFine).filter(LibraryFine.school_id == current_user.school_id)
    if current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN')):
        q = q.execution_options(include_deleted=True)
    q = q.order_by(LibraryFine.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[{"id": str(f.id), "member_id": str(f.member_id), "amount": str(f.amount), "status": f.status, "created_at": f.created_at.isoformat() if f.created_at else None} for f in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )
