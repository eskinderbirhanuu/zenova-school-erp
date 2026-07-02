from pydantic import BaseModel
from datetime import datetime


class SubjectGrade(BaseModel):
    subject: str
    average: float
    max: float
    percentage: float
    grade: str
    exams: list[dict]


class ReportCardResponse(BaseModel):
    id: str
    school_id: str
    student_id: str
    semester_id: str
    academic_year_id: str
    pdf_url: str | None = None
    generated_at: datetime | None = None


class ReportCardDetail(BaseModel):
    id: str
    student_name: str
    student_id: str
    class_name: str
    semester_name: str
    overall_percentage: float
    overall_grade: str
    subject_grades: list[SubjectGrade]
    generated_at: datetime | None = None
