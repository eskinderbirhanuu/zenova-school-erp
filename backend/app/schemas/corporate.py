from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field


class CorporateDepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    description: str | None = None


class CorporateDepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    head_employee_id: str | None = None
    is_active: bool | None = None


class CorporateDepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str | None
    head_employee_id: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CorporateEmployeeCreate(BaseModel):
    user_id: str = Field(..., description="ID of the existing user account this employee links to")
    full_name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., max_length=200)
    phone: str | None = None
    department_id: str | None = None
    position: str | None = None
    photo_url: str | None = None
    employment_date: date | None = None
    employment_type: str = "full-time"


class CorporateEmployeeUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    department_id: str | None = None
    position: str | None = None
    photo_url: str | None = None
    status: str | None = None
    employment_type: str | None = None


class CorporateEmployeeResponse(BaseModel):
    id: str
    employee_id: str
    user_id: str
    full_name: str
    email: str
    phone: str | None
    department_id: str | None
    position: str | None
    status: str
    photo_url: str | None
    employment_date: date | None
    employment_type: str
    created_at: datetime
    department_name: str | None = None
    role_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CorporateDashboardResponse(BaseModel):
    total_employees: int
    active_employees: int
    department_count: int
    employees_by_department: list[dict]
