from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    domain: str = Field(..., pattern=r"^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$")
    email: EmailStr
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
    
    # School-specific fields
    school_code: str = Field(..., pattern=r"^[A-Z0-9-]+$", description="Unique school code (e.g., SCH-001)")
    school_type: str = "main"
    country: str = ""
    city: str = ""

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    tagline: Optional[str] = None
    features: Optional[str] = None
    local_url: Optional[str] = None
    local_url_label: Optional[str] = None
    version: Optional[str] = None
    school_code: Optional[str] = None
    school_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None

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
    # School-specific fields
    school_code: str
    school_type: str
    country: str
    city: str

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    total: int
    items: list[CustomerResponse]


class SchoolCreateWithLicense(BaseModel):
    """Create a school and generate a license in one request."""
    # School info
    name: str = Field(..., min_length=1, max_length=255)
    domain: str = Field(..., pattern=r"^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$")
    email: EmailStr
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
    school_code: str = Field(..., pattern=r"^[A-Z0-9-]+$")
    school_type: str = "main"
    country: str = ""
    city: str = ""
    # License info
    license_type: str = "main"
    plan: str = "standard"
    seats: int = 500
    expires_at: str
    notes: str = ""


class SchoolCreateWithLicenseResponse(BaseModel):
    customer: CustomerResponse
    license_key: str
    license: dict  # LicenseResponse would be circular


from typing import Optional