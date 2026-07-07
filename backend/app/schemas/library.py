from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class BookCategoryCreate(BaseModel):
    name: str = Field(max_length=255)


class BookCategoryResponse(BaseModel):
    id: str; name: str; school_id: str; created_at: Optional[datetime] = None


class BookCreate(BaseModel):
    isbn: Optional[str] = None
    title: str = Field(max_length=500)
    author: Optional[str] = None
    publisher: Optional[str] = None
    year: Optional[int] = None
    category_id: Optional[str] = None
    total_quantity: int = 1
    shelf_location: Optional[str] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None; author: Optional[str] = None
    total_quantity: Optional[int] = None; shelf_location: Optional[str] = None


class BookResponse(BaseModel):
    id: str; isbn: Optional[str] = None; title: str; author: Optional[str] = None
    publisher: Optional[str] = None; year: Optional[int] = None; category_id: Optional[str] = None
    total_quantity: int; available_quantity: int; shelf_location: Optional[str] = None
    school_id: str; created_at: Optional[datetime] = None


class BorrowingCreate(BaseModel):
    book_id: str; borrower_type: str = Field(max_length=20)
    borrower_id: str; due_date: date


class BorrowingResponse(BaseModel):
    id: str; book_id: str; borrower_type: str; borrower_id: str
    borrow_date: date; due_date: date; return_date: Optional[date] = None
    status: str; fine_amount: Decimal; school_id: str; created_by: str; created_at: Optional[datetime] = None
