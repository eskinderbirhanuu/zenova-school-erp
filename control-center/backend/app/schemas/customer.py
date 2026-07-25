from datetime import datetime
from pydantic import BaseModel

class CustomerCreate(BaseModel):
    name: str
    domain: str
    email: str
    phone: str = ""
    address: str = ""
    notes: str = ""

class CustomerUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None

class CustomerResponse(BaseModel):
    id: int
    name: str
    domain: str
    email: str
    phone: str
    address: str
    notes: str
    is_active: bool
    version: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerListResponse(BaseModel):
    total: int
    items: list[CustomerResponse]
