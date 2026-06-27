from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str | None = Field(None, max_length=255, description="Email or employee_id")
    employee_id: str | None = Field(None, max_length=50, description="Employee number for login")
    password: str = Field(..., min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = Field(None, max_length=50)
    role_id: str | None = None
    school_id: str | None = None
    branch_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    employee_id: str | None = None
    role_name: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    employee_id: str | None = None
    full_name: str
    phone: str | None
    is_active: bool
    is_superuser: bool
    is_view_only: bool
    role_id: str | None
    role_name: str | None
    school_id: str | None
    branch_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class LoginAuditResponse(BaseModel):
    id: str
    user_id: str
    action: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime

    class Config:
        from_attributes = True
