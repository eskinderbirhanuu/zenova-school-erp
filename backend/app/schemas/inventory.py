from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class InventoryCategoryCreate(BaseModel):
    name: str = Field(max_length=255)
    description: Optional[str] = None


class InventoryCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class InventoryCategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    school_id: str
    created_at: Optional[datetime] = None


class InventoryItemCreate(BaseModel):
    sku: str = Field(max_length=100)
    name: str = Field(max_length=255)
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = None
    quantity: float = 0.0
    min_quantity: float = 0.0
    unit_price: float = 0.0


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = None
    min_quantity: Optional[float] = None
    unit_price: Optional[float] = None


class InventoryItemResponse(BaseModel):
    id: str
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = None
    quantity: float
    min_quantity: float
    unit_price: float
    school_id: str
    created_at: Optional[datetime] = None


class StockMovementCreate(BaseModel):
    item_id: str
    movement_type: str = Field(max_length=20)
    quantity: float
    reference: Optional[str] = None
    notes: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: str
    item_id: str
    movement_type: str
    quantity: float
    reference: Optional[str] = None
    notes: Optional[str] = None
    school_id: str
    created_by: str
    created_at: Optional[datetime] = None


class SupplierCreate(BaseModel):
    name: str = Field(max_length=255)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class SupplierResponse(BaseModel):
    id: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    school_id: str
    created_at: Optional[datetime] = None
