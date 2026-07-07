from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.corporate import (
    CorporateDepartmentCreate, CorporateDepartmentUpdate, CorporateDepartmentResponse,
    CorporateEmployeeCreate, CorporateEmployeeUpdate, CorporateEmployeeResponse,
    CorporateDashboardResponse,
)
from app.services import corporate_service
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User

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


@router.get("/corporate/employees", response_model=list[CorporateEmployeeResponse])
def list_employees(
    department_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_VIEW),
):
    emps = corporate_service.list_employees(db, department_id, status, limit, offset)
    result = []
    for emp in emps:
        d = emp.department.name if emp.department else None
        result.append(CorporateEmployeeResponse(
            **emp.__dict__,
            department_name=d,
        ))
    return result


@router.post("/corporate/employees", response_model=CorporateEmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: CorporateEmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_CREATE),
):
    emp = corporate_service.create_employee(
        db=db,
        full_name=data.full_name,
        email=data.email,
        user_id=data.user_id,
        phone=data.phone,
        department_id=data.department_id,
        position=data.position,
        photo_url=data.photo_url,
        employment_date=data.employment_date,
        employment_type=data.employment_type,
        created_by=current_user.id,
    )
    dept = emp.department.name if emp.department else None
    resp = CorporateEmployeeResponse(**emp.__dict__, department_name=dept)
    return resp


@router.get("/corporate/employees/{emp_id}", response_model=CorporateEmployeeResponse)
def get_employee(
    emp_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CORPORATE_EMPLOYEE_VIEW),
):
    emp = corporate_service.get_employee(db, emp_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    dept = emp.department.name if emp.department else None
    return CorporateEmployeeResponse(**emp.__dict__, department_name=dept)


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
    dept = emp.department.name if emp.department else None
    return CorporateEmployeeResponse(**emp.__dict__, department_name=dept)


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
