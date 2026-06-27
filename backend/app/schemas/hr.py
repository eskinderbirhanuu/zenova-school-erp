from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime, time


class ContractCreate(BaseModel):
    staff_profile_id: str
    contract_type: str = Field(max_length=50)
    start_date: date
    end_date: Optional[date] = None
    position: str = Field(max_length=255)
    department: Optional[str] = None
    basic_salary: float
    notes: Optional[str] = None


class ContractResponse(BaseModel):
    id: str
    staff_profile_id: str
    contract_type: str
    start_date: date
    end_date: Optional[date] = None
    position: str
    department: Optional[str] = None
    basic_salary: float
    status: str
    notes: Optional[str] = None
    created_by: str
    created_at: Optional[datetime] = None


class LeaveTypeCreate(BaseModel):
    name: str = Field(max_length=100)
    default_days: int
    is_paid: bool = True


class LeaveTypeResponse(BaseModel):
    id: str
    name: str
    default_days: int
    is_paid: bool
    school_id: str
    created_at: Optional[datetime] = None


class LeaveRequestCreate(BaseModel):
    staff_profile_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: str
    staff_profile_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    days: int
    reason: Optional[str] = None
    status: str
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None


class LeaveBalanceResponse(BaseModel):
    id: str
    staff_profile_id: str
    leave_type_id: str
    year: int
    total_days: int
    used_days: int
    remaining_days: int


class AttendanceCreate(BaseModel):
    staff_profile_id: Optional[str] = None
    student_id: Optional[str] = None
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: str = "present"
    reason: Optional[str] = None


class AttendanceBulkItem(BaseModel):
    student_id: Optional[str] = None
    staff_profile_id: Optional[str] = None
    date: date
    status: str = "present"
    reason: Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: Optional[str] = None
    reason: Optional[str] = None


class AttendanceBulkResponse(BaseModel):
    created: int
    errors: list = []


class AttendanceResponse(BaseModel):
    id: str
    staff_profile_id: Optional[str] = None
    student_id: Optional[str] = None
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: str
    reason: Optional[str] = None
    school_id: str
    marked_by: Optional[str] = None
    created_at: Optional[datetime] = None


class PerformanceReviewCreate(BaseModel):
    staff_profile_id: str
    period: str = Field(max_length=100)
    rating: Optional[int] = None
    comments: Optional[str] = None


class PerformanceReviewResponse(BaseModel):
    id: str
    staff_profile_id: str
    reviewer_id: str
    period: str
    rating: Optional[int] = None
    comments: Optional[str] = None
    created_at: Optional[datetime] = None
