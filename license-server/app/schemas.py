from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class SchoolRegister(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    password: str


class SchoolResponse(BaseModel):
    id: str
    name: str
    email: str
    tier: str
    is_active: bool
    registered_at: str


class LicenseKeyGenerate(BaseModel):
    school_id: str
    license_type: str = "main"
    valid_until: Optional[str] = None
    max_users: int = 100
    max_branches: int = 1


class LicenseVerifyRequest(BaseModel):
    key: str
    machine_fingerprint: Optional[str] = None


class LicenseVerifyResponse(BaseModel):
    valid: bool
    license_type: Optional[str] = None
    status: Optional[str] = None
    valid_until: Optional[str] = None
    max_users: Optional[int] = None
    message: str = ""


class LicenseActivateRequest(BaseModel):
    key: str
    machine_fingerprint: str


class LicenseActivateResponse(BaseModel):
    activated: bool
    message: str = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


class MonitoringReport(BaseModel):
    school_id: str
    event_type: str
    payload: Optional[str] = None
