from pydantic import BaseModel
from datetime import datetime


class StudentDocumentResponse(BaseModel):
    id: str
    student_id: str
    filename: str
    file_url: str
    file_type: str | None = None
    uploaded_by: str | None = None
    created_at: datetime | None = None


class StudentDocumentCreate(BaseModel):
    filename: str
    file_url: str
    file_type: str | None = None
