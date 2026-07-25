from datetime import datetime
from pydantic import BaseModel

class LicenseCreate(BaseModel):
    customer_id: int
    plan: str = "standard"
    seats: int = 500
    expires_at: str  # ISO date string
    notes: str = ""

class LicenseResponse(BaseModel):
    id: int
    customer_id: int
    license_key: str
    plan: str
    seats: int
    is_active: bool
    expires_at: datetime
    last_validated: datetime | None
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True

class LicenseValidateRequest(BaseModel):
    license_key: str
    school_id: str
    domain: str

class LicenseValidateResponse(BaseModel):
    valid: bool
    plan: str = ""
    seats: int = 0
    expires_at: str = ""
    message: str = ""
