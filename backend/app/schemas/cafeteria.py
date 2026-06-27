from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProductCreate(BaseModel):
    name: str = Field(max_length=255)
    price: float; category: Optional[str] = None; stock: int = 0


class ProductResponse(BaseModel):
    id: str; name: str; price: float; category: Optional[str] = None
    stock: int; school_id: str; created_at: Optional[datetime] = None


class OrderItemCreate(BaseModel):
    product_id: str; quantity: int


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None


class OrderStatusUpdate(BaseModel):
    status: str


class OrderCreate(BaseModel):
    customer_type: str = Field(max_length=20)
    customer_id: Optional[str] = None
    items: list[OrderItemCreate]
    payment_method: Optional[str] = None


class OrderResponse(BaseModel):
    id: str; customer_type: str; customer_id: Optional[str] = None
    total: float; status: str; payment_method: Optional[str] = None
    school_id: str; created_by: str; created_at: Optional[datetime] = None
