from datetime import date, datetime
from pydantic import BaseModel, Field


class StaffCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=50)
    role_name: str = Field(..., pattern="^(REGISTRAR|FINANCE|HR|INVENTORY|LIBRARY|CAFETERIA|AUDITOR)$")
    department: str | None = None
    employment_date: date | None = None
    photo_url: str | None = None
    school_id: str | None = None
    branch_id: str | None = None
    username: str | None = None
    password: str | None = Field(None, min_length=8)


class StaffResponse(BaseModel):
    id: str
    staff_id: str
    user_id: str
    full_name: str
    email: str
    phone: str
    role_name: str
    department: str | None
    employment_date: date | None
    photo_url: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StaffUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    department: str | None = None
    employment_date: date | None = None
    photo_url: str | None = None


class StaffListResult(BaseModel):
    id: str
    staff_id: str
    full_name: str
    email: str
    role_name: str
    department: str | None
    is_active: bool
