from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, time, datetime


class AcademicYearCreate(BaseModel):
    name: str
    start_date: date
    end_date: date


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None


class AcademicYearResponse(BaseModel):
    id: str
    name: str
    start_date: date
    end_date: date
    is_current: bool
    school_id: str
    created_at: Optional[datetime] = None


class SemesterCreate(BaseModel):
    name: str
    academic_year_id: str
    start_date: date
    end_date: date


class SemesterResponse(BaseModel):
    id: str
    name: str
    academic_year_id: str
    start_date: date
    end_date: date
    created_at: Optional[datetime] = None


class ClassGradeCreate(BaseModel):
    name: str = Field(max_length=100)
    code: str = Field(max_length=50)


class ClassGradeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None


class ClassGradeResponse(BaseModel):
    id: str
    name: str
    code: str
    school_id: str
    created_at: Optional[datetime] = None


class SectionCreate(BaseModel):
    name: str = Field(max_length=100)
    class_id: str
    capacity: Optional[int] = None


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None


class SectionResponse(BaseModel):
    id: str
    name: str
    class_id: str
    capacity: Optional[int] = None
    created_at: Optional[datetime] = None


class SubjectCreate(BaseModel):
    name: str = Field(max_length=255)
    code: str = Field(max_length=50)
    class_id: str
    is_optional: bool = False


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_optional: Optional[bool] = None


class SubjectResponse(BaseModel):
    id: str
    name: str
    code: str
    class_id: str
    is_optional: bool
    created_at: Optional[datetime] = None


class ClassroomCreate(BaseModel):
    name: str = Field(max_length=100)
    capacity: Optional[int] = None


class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None


class ClassroomResponse(BaseModel):
    id: str
    name: str
    capacity: Optional[int] = None
    school_id: str
    created_at: Optional[datetime] = None


class TimetableEntryCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    subject_id: str
    teacher_id: Optional[str] = None
    section_id: str
    classroom_id: Optional[str] = None


class TimetableEntryUpdate(BaseModel):
    day_of_week: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    classroom_id: Optional[str] = None


class TimetableEntryResponse(BaseModel):
    id: str
    day_of_week: int
    start_time: time
    end_time: time
    subject_id: str
    teacher_id: Optional[str] = None
    section_id: str
    classroom_id: Optional[str] = None
    created_at: Optional[datetime] = None


class ExamTypeCreate(BaseModel):
    name: str = Field(max_length=100)
    weight: Optional[float] = None


class ExamTypeResponse(BaseModel):
    id: str
    name: str
    weight: Optional[float] = None
    created_at: Optional[datetime] = None


class ExamCreate(BaseModel):
    name: str = Field(max_length=255)
    exam_type_id: str
    subject_id: str
    class_id: str
    semester_id: Optional[str] = None
    exam_date: Optional[date] = None
    max_score: Optional[float] = None


class ExamUpdate(BaseModel):
    name: Optional[str] = None
    exam_date: Optional[date] = None
    max_score: Optional[float] = None


class ExamResponse(BaseModel):
    id: str
    name: str
    exam_type_id: str
    subject_id: str
    class_id: str
    semester_id: Optional[str] = None
    exam_date: Optional[date] = None
    max_score: Optional[float] = None
    created_at: Optional[datetime] = None


class ExamResultCreate(BaseModel):
    exam_id: str
    student_id: str
    score: float
    remarks: Optional[str] = None


class ExamResultUpdate(BaseModel):
    score: Optional[float] = None
    remarks: Optional[str] = None


class ExamResultResponse(BaseModel):
    id: str
    exam_id: str
    student_id: str
    score: float
    grade: Optional[str] = None
    remarks: Optional[str] = None
    entered_by: Optional[str] = None
    created_at: Optional[datetime] = None


class PromotionCreate(BaseModel):
    student_id: str
    to_class_id: str


class PromotionResponse(BaseModel):
    id: str
    student_id: str
    from_class_id: str
    to_class_id: str
    academic_year_id: str
    promoted_by: Optional[str] = None
    created_at: Optional[datetime] = None


class BulkExamResultCreate(BaseModel):
    results: list[ExamResultCreate]


class BulkPromotionCreate(BaseModel):
    student_ids: list[str]
    to_class_id: str
