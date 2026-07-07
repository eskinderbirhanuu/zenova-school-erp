from decimal import Decimal
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
    quantity: Decimal = Decimal("0.00")
    min_quantity: Decimal = Decimal("0.00")
    unit_price: Decimal = Decimal("0.00")


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = None
    min_quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None


class InventoryItemResponse(BaseModel):
    id: str
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = None
    quantity: Decimal
    min_quantity: Decimal
    unit_price: Decimal
    school_id: str
    created_at: Optional[datetime] = None


class StockMovementCreate(BaseModel):
    item_id: str
    movement_type: str = Field(max_length=20)
    quantity: Decimal
    reference: Optional[str] = None
    notes: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: str
    item_id: str
    movement_type: str
    quantity: Decimal
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
