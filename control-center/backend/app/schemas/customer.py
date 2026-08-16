from datetime import datetime
from pydantic import BaseModel

class CustomerCreate(BaseModel):
    name: str
    domain: str
    email: str
    phone: str = ""
    address: str = ""
    notes: str = ""
    logo_url: str = ""
    primary_color: str = "#6366F1"
    secondary_color: str = "#8B5CF6"
    accent_color: str = "#EC4899"
    tagline: str = ""
    features: str = "{}"
    local_url: str = ""
    local_url_label: str = ""

class CustomerUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    accent_color: str | None = None
    tagline: str | None = None
    features: str | None = None
    local_url: str | None = None
    local_url_label: str | None = None

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
    logo_url: str
    primary_color: str
    secondary_color: str
    accent_color: str
    tagline: str
    features: str
    local_url: str
    local_url_label: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerListResponse(BaseModel):
    total: int
    items: list[CustomerResponse]
