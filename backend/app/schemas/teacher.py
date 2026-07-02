from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class TeacherCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=50)
    gender: str | None = Field(None, pattern="^(male|female)$")
    qualification: str | None = None
    department: str | None = None
    employment_date: date | None = None
    photo_url: str | None = None
    school_id: str | None = None
    branch_id: str | None = None
    username: str | None = None
    password: str | None = Field(None, min_length=8)


class TeacherResponse(BaseModel):
    id: str
    teacher_id: str
    user_id: str
    full_name: str
    email: str
    phone: str
    qualification: str | None
    department: str | None
    employment_date: date | None
    photo_url: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherListResult(BaseModel):
    id: str
    teacher_id: str
    full_name: str
    email: str
    department: str | None
    qualification: str | None
    is_active: bool


class AssignGradeRequest(BaseModel):
    grade_id: str


class AssignSectionRequest(BaseModel):
    section_id: str
