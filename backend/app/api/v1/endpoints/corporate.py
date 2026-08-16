from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.schemas.corporate import (
    CorporateDepartmentCreate, CorporateDepartmentUpdate, CorporateDepartmentResponse,
    CorporateEmployeeCreate, CorporateEmployeeUpdate, CorporateEmployeeResponse,
    CorporateDashboardResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.core.pagination import paginate, build_paginated_response
from app.services import corporate_service
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.corporate_employee import CorporateEmployee

def _employee_to_response(emp: CorporateEmployee) -> CorporateEmployeeResponse:
    dept = emp.department.name if emp.department else None
    return CorporateEmployeeResponse(**emp.__dict__, department_name=dept)


router = APIRouter(tags=["corporate"])


@router.get("/corporate/departments", response_model=list[CorporateDepartmentResponse])
def list_departments(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_VIEW),
):
    depts = corporate_service.list_departments(db, active_only=not include_inactive)
    return [CorporateDepartmentResponse.model_validate(d) for d in depts]


@router.post("/corporate/departments", response_model=CorporateDepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    data: CorporateDepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_DEPARTMENT_MANAGE),
):
    try:
        dept = corporate_service.create_department(db, data.name, data.code, data.description, current_user.id)
        return CorporateDepartmentResponse.model_validate(dept)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.patch("/corporate/departments/{dept_id}", response_model=CorporateDepartmentResponse)
def update_department(
    dept_id: str,
    data: CorporateDepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_DEPARTMENT_MANAGE),
):
    dept = corporate_service.update_department(db, dept_id, data.model_dump(exclude_unset=True), current_user.id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return CorporateDepartmentResponse.model_validate(dept)


@router.get("/corporate/employees")
def list_employees(
    department_id: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_VIEW),
):
    q = db.query(CorporateEmployee).options(joinedload(CorporateEmployee.department))
    if department_id:
        q = q.filter(CorporateEmployee.department_id == department_id)
    if status:
        q = q.filter(CorporateEmployee.status == status)
    q = q.order_by(CorporateEmployee.full_name)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    result = [_employee_to_response(emp) for emp in items]
    return build_paginated_response(
        items=result,
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/corporate/employees", response_model=CorporateEmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: CorporateEmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_CREATE),
):
    emp = corporate_service.create_employee(
        db=db,
        **data.model_dump(),
        created_by=current_user.id,
    )
    return _employee_to_response(emp)


@router.get("/corporate/employees/{emp_id}", response_model=CorporateEmployeeResponse)
def get_employee(
    emp_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_VIEW),
):
    emp = corporate_service.get_employee(db, emp_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _employee_to_response(emp)


@router.patch("/corporate/employees/{emp_id}", response_model=CorporateEmployeeResponse)
def update_employee(
    emp_id: str,
    data: CorporateEmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_EDIT),
):
    emp = corporate_service.update_employee(db, emp_id, data.model_dump(exclude_unset=True), current_user.id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _employee_to_response(emp)


@router.delete("/corporate/employees/{emp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    emp_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_EDIT),
):
    ok = corporate_service.delete_employee(db, emp_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")


@router.get("/corporate/dashboard", response_model=CorporateDashboardResponse)
def corporate_dashboard(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_SETTINGS_MANAGE),
):
    data = corporate_service.get_dashboard(db)
    return CorporateDashboardResponse(**data)
