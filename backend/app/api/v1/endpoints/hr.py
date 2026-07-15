from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_auth_context
from app.core.auth_deps import AuthContext
from app.core.permissions import Permission
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


def _include_deleted(ctx: AuthContext) -> bool:
    return ctx.is_superuser or ctx.role in ("ADMIN", "SUPER_ADMIN")


@router.post("/contracts", response_model=ContractResponse)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE)
    return hr_service.create_contract(db, data, ctx.id, ctx.school_id)


@router.get("/contracts")
def list_contracts(
    staff_profile_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context),
):
    ctx.require_permission(Permission.HR_MANAGE, Permission.STAFF_CREATE)
    include_deleted = _include_deleted(ctx)
    q = db.query(EmployeeContract).filter(EmployeeContract.school_id == ctx.school_id)
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


@router.post("/contracts/{contract_id}/terminate")
def terminate_contract(contract_id: str, end_date: str = Query(...), db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE)
    from datetime import date
    hr_service.terminate_contract(db, contract_id, date.fromisoformat(end_date), ctx.id, ctx.school_id, include_deleted=True)
    return {"message": "Contract terminated"}


@router.post("/leave-types", response_model=LeaveTypeResponse)
def create_leave_type(data: LeaveTypeCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE)
    return hr_service.create_leave_type(db, ctx.school_id, data, ctx.id)


@router.get("/leave-types", response_model=list[LeaveTypeResponse])
def list_leave_types(db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE, Permission.STAFF_CREATE)
    include_deleted = _include_deleted(ctx)
    return hr_service.get_leave_types(db, ctx.school_id, include_deleted=include_deleted)


@router.post("/leave-requests", response_model=LeaveRequestResponse)
def request_leave(data: LeaveRequestCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE)
    return hr_service.request_leave(db, data, ctx.id, ctx.school_id, include_deleted=True)


@router.get("/leave-requests")
def list_leave_requests(
    staff_profile_id: str = Query(None), status: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)
):
    ctx.require_permission(Permission.HR_MANAGE, Permission.STAFF_CREATE)
    include_deleted = _include_deleted(ctx)
    from app.models.staff_profile import StaffProfile
    q = db.query(LeaveRequest).join(
        StaffProfile, LeaveRequest.staff_profile_id == StaffProfile.id
    ).filter(StaffProfile.school_id == ctx.school_id)
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


@router.post("/leave-requests/{request_id}/approve")
def approve_leave(request_id: str, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE)
    hr_service.approve_leave(db, request_id, ctx.id, ctx.school_id, include_deleted=True)
    return {"message": "Leave approved"}


@router.post("/leave-requests/{request_id}/reject")
def reject_leave(request_id: str, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE)
    hr_service.reject_leave(db, request_id, ctx.id, ctx.school_id, include_deleted=True)
    return {"message": "Leave rejected"}


@router.get("/leave-balances", response_model=list[LeaveBalanceResponse])
def get_leave_balances(
    staff_profile_id: str = Query(...), year: int = Query(None),
    db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)
):
    ctx.require_permission(Permission.HR_MANAGE, Permission.STAFF_CREATE)
    include_deleted = _include_deleted(ctx)
    return hr_service.get_leave_balances(db, ctx.school_id, staff_profile_id, year, include_deleted=include_deleted)


@router.post("/performance-reviews", response_model=PerformanceReviewResponse)
def create_review(data: PerformanceReviewCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE)
    return hr_service.create_performance_review(db, data, ctx.id, ctx.school_id)


@router.get("/performance-reviews")
def list_reviews(
    staff_profile_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context),
):
    ctx.require_permission(Permission.HR_MANAGE, Permission.STAFF_CREATE)
    include_deleted = _include_deleted(ctx)
    q = db.query(PerformanceReview).filter(PerformanceReview.school_id == ctx.school_id)
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


@router.get("/recruitment", response_model=list[JobPostingResponse])
def list_jobs(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
              db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(Permission.HR_MANAGE, Permission.STAFF_CREATE)
    q = db.query(JobPosting).filter(JobPosting.school_id == ctx.school_id)
    if _include_deleted(ctx):
        q = q.execution_options(include_deleted=True)
    return q.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit).all()
