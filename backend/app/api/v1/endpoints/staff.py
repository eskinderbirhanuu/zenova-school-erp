from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.staff import (
    StaffCreate, StaffUpdate, StaffResponse, StaffListResult,
)
from app.services import staff_service, id_service
from app.api.v1.deps import get_current_user
from app.core.permissions import PermissionChecker, RolePermission
from app.models.user import User

router = APIRouter(tags=["staff"])


@router.post("/staff", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    data: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STAFF_CREATE)),
):
    """Create a staff account (DIRECTOR only)"""
    school_id = data.school_id or current_user.school_id
    staff_id = id_service.generate_id(db, "staff", school_id)
    password = data.password or "changeme123"

    try:
        result = staff_service.create_staff(
            db=db,
            staff_id=staff_id,
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            role_name=data.role_name,
            password=password,
            department=data.department,
            employment_date=data.employment_date,
            photo_url=data.photo_url,
            school_id=school_id,
            branch_id=data.branch_id or current_user.branch_id,
            created_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return StaffResponse(
        id=result["profile"].id,
        staff_id=result["profile"].staff_id,
        user_id=result["user"].id,
        full_name=result["user"].full_name,
        email=result["user"].email,
        phone=result["user"].phone,
        role_name=data.role_name,
        department=result["profile"].department,
        employment_date=result["profile"].employment_date,
        photo_url=result["user"].photo_url,
        is_active=result["user"].is_active,
        created_at=result["user"].created_at,
    )


@router.get("/staff", response_model=list[StaffListResult])
def list_staff(
    role_name: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    staff = staff_service.list_staff(db, current_user.school_id, role_name)
    return [StaffListResult(**s) for s in staff]


@router.get("/staff/{id}", response_model=StaffResponse)
def get_staff(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = staff_service.get_staff_by_id(db, id, current_user.school_id)
    if not result:
        raise HTTPException(404, "Staff not found")
    return StaffResponse(**result)


@router.put("/staff/{id}", response_model=StaffResponse)
def update_staff(
    id: str,
    data: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STAFF_CREATE)),
):
    result = staff_service.update_staff(db, id, current_user.school_id, data, current_user.id)
    return StaffResponse(**result)


@router.delete("/staff/{id}", status_code=status.HTTP_200_OK)
def deactivate_staff(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STAFF_CREATE)),
):
    return staff_service.deactivate_staff(db, id, current_user.school_id, current_user.id)
