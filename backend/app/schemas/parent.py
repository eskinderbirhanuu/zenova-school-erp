from datetime import datetime
from pydantic import BaseModel, Field


class ParentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    relationship: str | None = Field(None, pattern="^(father|mother|guardian|other)$")
    phone_1: str = Field(..., min_length=5, max_length=50)
    phone_2: str | None = Field(None, max_length=50)
    occupation: str | None = None
    address: str | None = None
    national_id: str | None = None
    passport_id: str | None = None
    kebele_id: str | None = None
    photo_url: str | None = None
    school_id: str | None = None


class ParentUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=255)
    relationship: str | None = None
    phone_1: str | None = Field(None, min_length=5, max_length=50)
    phone_2: str | None = None
    occupation: str | None = None
    address: str | None = None
    national_id: str | None = None
    passport_id: str | None = None
    kebele_id: str | None = None
    photo_url: str | None = None


class ParentResponse(BaseModel):
    id: str
    parent_id: str | None
    full_name: str
    relationship: str | None
    phone_1: str
    phone_2: str | None
    occupation: str | None
    address: str | None
    national_id: str | None
    passport_id: str | None
    kebele_id: str | None
    photo_url: str | None
    school_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ParentSearchRequest(BaseModel):
    query: str = Field(..., min_length=2)


class ParentSearchResult(BaseModel):
    id: str
    full_name: str
    phone_1: str
    relationship: str | None
    match_type: str


class LinkStudentRequest(BaseModel):
    student_id: str
    relationship: str | None = None
    is_primary: bool = False


class LinkedStudent(BaseModel):
    student_id: str
    student_name: str
    grade_name: str | None
    relationship: str | None
    is_primary: bool


class ParentWithStudents(ParentResponse):
    linked_students: list[LinkedStudent] = []
