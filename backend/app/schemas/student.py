from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class StudentCreate(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=100)
    middle_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    gender: str = Field(..., pattern="^(male|female)$")
    date_of_birth: date
    grade_id: str | None = None
    section_id: str | None = None
    academic_year_id: str | None = None
    address: str | None = None
    nationality: str | None = None
    stream: str | None = None
    medical_notes: str | None = None
    blood_group: str | None = Field(None, pattern="^(A[+-]|B[+-]|AB[+-]|O[+-])$")
    photo_url: str | None = None
    emergency_contact: str | None = None
    admission_date: date | None = None
    school_id: str | None = None
    branch_id: str | None = None


class StudentUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=2, max_length=100)
    middle_name: str | None = Field(None, min_length=2, max_length=100)
    last_name: str | None = Field(None, min_length=2, max_length=100)
    gender: str | None = Field(None, pattern="^(male|female)$")
    date_of_birth: date | None = None
    grade_id: str | None = None
    section_id: str | None = None
    stream: str | None = None
    medical_notes: str | None = None
    address: str | None = None
    nationality: str | None = None
    blood_group: str | None = Field(None, pattern="^(A[+-]|B[+-]|AB[+-]|O[+-])$")
    photo_url: str | None = None
    emergency_contact: str | None = None
    status: str | None = Field(None, pattern="^(active|transferred|graduated|withdrawn)$")


class StudentResponse(BaseModel):
    id: str
    student_id: str
    first_name: str
    middle_name: str
    last_name: str
    gender: str
    date_of_birth: date
    grade_id: str | None
    section_id: str | None
    academic_year_id: str | None
    address: str | None
    nationality: str | None
    stream: str | None
    medical_notes: str | None
    blood_group: str | None
    photo_url: str | None
    emergency_contact: str | None
    admission_date: date
    status: str
    school_id: str | None
    branch_id: str | None
    registered_by: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentSearchResult(BaseModel):
    id: str
    student_id: str
    full_name: str
    gender: str
    grade_name: str | None
    section_name: str | None
    status: str


class TransferRequest(BaseModel):
    grade_id: str
    section_id: str | None = None
    reason: str | None = None


class PromoteRequest(BaseModel):
    to_grade_id: str
    academic_year_id: str
