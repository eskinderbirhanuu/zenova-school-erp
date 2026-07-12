from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.core.pagination import paginate, build_paginated_response
from app.models.recruitment import JobPosting
from app.models.contract import EmployeeContract
from app.models.leave import LeaveRequest
from app.models.performance import PerformanceReview
from app.schemas.hr import (
    ContractCreate, ContractResponse,
    LeaveTypeCreate, LeaveTypeResponse,
    LeaveRequestCreate, LeaveRequestResponse,
    LeaveBalanceResponse,
    PerformanceReviewCreate, PerformanceReviewResponse,
)
from app.schemas.recruitment import JobPostingResponse
from app.services import hr_service

router = APIRouter(tags=["hr"])

HR = [require_permission(Permission.HR_MANAGE)]
HR_ADMIN = [require_permission(Permission.HR_MANAGE)]
VIEW_HR = [require_permission(Permission.HR_MANAGE, Permission.STAFF_CREATE)]


@router.post("/contracts", response_model=ContractResponse, dependencies=HR_ADMIN)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.create_contract(db, data, current_user.id, current_user.school_id)


@router.get("/contracts", dependencies=VIEW_HR)
def list_contracts(
    staff_profile_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(EmployeeContract).filter(EmployeeContract.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if staff_profile_id:
        q = q.filter(EmployeeContract.staff_profile_id == staff_profile_id)
    q = q.order_by(EmployeeContract.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[ContractResponse.model_validate(c) for c in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


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


@router.get("/leave-requests", dependencies=VIEW_HR)
def list_leave_requests(
    staff_profile_id: str = Query(None), status: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    from app.models.staff_profile import StaffProfile
    q = db.query(LeaveRequest).join(
        StaffProfile, LeaveRequest.staff_profile_id == StaffProfile.id
    ).filter(StaffProfile.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if staff_profile_id:
        q = q.filter(LeaveRequest.staff_profile_id == staff_profile_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    q = q.order_by(LeaveRequest.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[LeaveRequestResponse.model_validate(lr) for lr in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


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


@router.post("/performance-reviews", response_model=PerformanceReviewResponse, dependencies=HR_ADMIN)
def create_review(data: PerformanceReviewCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return hr_service.create_performance_review(db, data, current_user.id, current_user.school_id)


@router.get("/performance-reviews", dependencies=VIEW_HR)
def list_reviews(
    staff_profile_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(PerformanceReview).filter(PerformanceReview.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if staff_profile_id:
        q = q.filter(PerformanceReview.staff_profile_id == staff_profile_id)
    q = q.order_by(PerformanceReview.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[PerformanceReviewResponse.model_validate(r) for r in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.get("/recruitment", response_model=list[JobPostingResponse], dependencies=VIEW_HR)
def list_jobs(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
              db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(JobPosting).filter(JobPosting.school_id == current_user.school_id)
    if current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN')):
        q = q.execution_options(include_deleted=True)
    return q.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit).all()
