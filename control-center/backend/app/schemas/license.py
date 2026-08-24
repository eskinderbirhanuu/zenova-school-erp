from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class LicenseType(str, Enum):
    MAIN = "main"
    BRANCH = "branch"
    TRIAL = "trial"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"


class LicenseStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    REVOKED = "revoked"
    PENDING = "pending"


class LicenseCreate(BaseModel):
    customer_id: int
    license_type: LicenseType = LicenseType.MAIN
    plan: str = "standard"
    seats: int = Field(default=500, ge=1)
    expires_at: str
    notes: str = ""


class LicenseUpdate(BaseModel):
    plan: Optional[str] = None
    seats: Optional[int] = Field(default=None, ge=1)
    expires_at: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class LicenseResponse(BaseModel):
    id: int
    customer_id: int
    license_key: str
    license_type: LicenseType
    status: LicenseStatus
    plan: str
    seats: int
    is_active: bool
    issued_at: datetime
    activated_at: Optional[datetime]
    expires_at: datetime
    revoked_at: Optional[datetime]
    last_validated: Optional[datetime]
    notes: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LicenseListResponse(BaseModel):
    items: list[LicenseResponse]
    total: int


class LicenseValidateRequest(BaseModel):
    license_key: str
    school_id: str
    domain: str


class LicenseValidateResponse(BaseModel):
    valid: bool
    plan: str = ""
    seats: int = 0
    expires_at: str = ""
    license_type: str = ""
    status: str = ""
    message: str = ""
    issued_at: str = ""
    activated_at: str = ""
    revoked_at: str = ""
    seats_used: int = 0


class LicenseKeyGenerateRequest(BaseModel):
    customer_id: int
    license_type: LicenseType = LicenseType.MAIN
    plan: str = "standard"
    seats: int = Field(default=500, ge=1)
    expires_at: str
    notes: str = ""


class LicenseKeyGenerateResponse(BaseModel):
    license_key: str
    license: LicenseResponse