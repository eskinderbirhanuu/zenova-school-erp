from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    is_superuser: bool
    is_view_only: bool = False
    role_name: Optional[str] = None
    school_id: Optional[str] = None
    branch_id: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    role_id: Optional[str] = None
    is_view_only: Optional[bool] = None


class RoleResponse(BaseModel):
    id: str
    name: str
    level: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
