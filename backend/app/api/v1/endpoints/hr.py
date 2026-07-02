from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.models.recruitment import JobPosting
from app.schemas.hr import (
    ContractCreate, ContractResponse,
    LeaveTypeCreate, LeaveTypeResponse,
    LeaveRequestCreate, LeaveRequestResponse,
    LeaveBalanceResponse,
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    PerformanceReviewCreate, PerformanceReviewResponse,
)
from app.schemas.recruitment import JobPostingResponse
from app.services import hr_service

router = APIRouter()

HR = [require_role("HR")]
HR_ADMIN = [require_role("HR", "ADMIN")]
VIEW_HR = [require_role("HR", "ADMIN", "DIRECTOR")]


@router.post("/contracts", response_model=ContractResponse, dependencies=HR_ADMIN)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.create_contract(db, data, current_user.id, current_user.school_id)


@router.get("/contracts", response_model=list[ContractResponse], dependencies=VIEW_HR)
def list_contracts(staff_profile_id: str = Query(None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return hr_service.get_contracts(db, current_user.school_id, staff_profile_id, include_deleted=include_deleted)


@router.post("/contracts/{contract_id}/terminate", dependencies=HR_ADMIN)
def terminate_contract(contract_id: str, end_date: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from datetime import date
    hr_service.terminate_contract(db, contract_id, date.fromisoformat(end_date), current_user.id, current_user.school_id, include_deleted=True)
    return {"message": "Contract terminated"}


@router.post("/leave-types", response_model=LeaveTypeResponse, dependencies=HR_ADMIN)
def create_leave_type(data: LeaveTypeCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.create_leave_type(db, current_user.school_id, data, current_user.id)


@router.get("/leave-types", response_model=list[LeaveTypeResponse], dependencies=VIEW_HR)
def list_leave_types(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return hr_service.get_leave_types(db, current_user.school_id, include_deleted=include_deleted)


@router.post("/leave-requests", response_model=LeaveRequestResponse, dependencies=HR)
def request_leave(data: LeaveRequestCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.request_leave(db, data, current_user.id, current_user.school_id, include_deleted=True)


@router.get("/leave-requests", response_model=list[LeaveRequestResponse], dependencies=VIEW_HR)
def list_leave_requests(
    staff_profile_id: str = Query(None), status: str = Query(None),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return hr_service.get_leave_requests(db, current_user.school_id, staff_profile_id, status, include_deleted=include_deleted)


@router.post("/leave-requests/{request_id}/approve", dependencies=HR_ADMIN)
def approve_leave(request_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    hr_service.approve_leave(db, request_id, current_user.id, current_user.school_id, include_deleted=True)
    return {"message": "Leave approved"}


@router.post("/leave-requests/{request_id}/reject", dependencies=HR_ADMIN)
def reject_leave(request_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    hr_service.reject_leave(db, request_id, current_user.id, current_user.school_id, include_deleted=True)
    return {"message": "Leave rejected"}


@router.get("/leave-balances", response_model=list[LeaveBalanceResponse], dependencies=VIEW_HR)
def get_leave_balances(
    staff_profile_id: str = Query(...), year: int = Query(None),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return hr_service.get_leave_balances(db, current_user.school_id, staff_profile_id, year, include_deleted=include_deleted)


@router.post("/attendance", response_model=AttendanceResponse, dependencies=HR)
def mark_attendance(data: AttendanceCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.mark_attendance(db, current_user.school_id, data, current_user.id, include_deleted=True)


@router.post("/attendance/bulk", dependencies=HR)
def bulk_attendance(data: list[AttendanceCreate], db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    result = hr_service.bulk_mark_attendance(db, current_user.school_id, [d.model_dump() for d in data], current_user.id, include_deleted=True)
    return result


@router.patch("/attendance/{attendance_id}", response_model=AttendanceResponse, dependencies=HR)
def update_attendance(attendance_id: str, data: AttendanceUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.update_attendance(db, attendance_id, data, current_user.id, current_user.school_id, include_deleted=True)


@router.get("/attendance", response_model=list[AttendanceResponse], dependencies=VIEW_HR)
def list_attendance(
    date_filter: str = Query(None, alias="date"), staff_profile_id: str = Query(None),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    from datetime import date
    d = date.fromisoformat(date_filter) if date_filter else None
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return hr_service.get_attendance(db, current_user.school_id, d, staff_profile_id, include_deleted=include_deleted)


@router.post("/performance-reviews", response_model=PerformanceReviewResponse, dependencies=HR_ADMIN)
def create_review(data: PerformanceReviewCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.create_performance_review(db, data, current_user.id, current_user.school_id)


@router.get("/performance-reviews", response_model=list[PerformanceReviewResponse], dependencies=VIEW_HR)
def list_reviews(staff_profile_id: str = Query(None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return hr_service.get_performance_reviews(db, current_user.school_id, staff_profile_id, include_deleted=include_deleted)


@router.get("/recruitment", response_model=list[JobPostingResponse], dependencies=VIEW_HR)
def list_jobs(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
              db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(JobPosting).filter(JobPosting.school_id == current_user.school_id)
    if current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN')):
        q = q.execution_options(include_deleted=True)
    return q.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit).all()
