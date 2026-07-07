from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.school import School
from app.models.branch import Branch

router = APIRouter(tags=["schools"])


class SchoolUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    motto: str | None = None


def _school_to_dict(school: School, branch_count: int) -> dict:
    return {
        "id": school.id,
        "name": school.name,
        "code": school.code,
        "address": school.address,
        "phone": school.phone,
        "email": school.email,
        "motto": school.motto,
        "is_active": school.is_active,
        "is_setup_complete": school.is_setup_complete,
        "branch_count": branch_count,
        "created_at": school.created_at.isoformat() if school.created_at else None,
    }


@router.get("/schools/me")
def get_my_school(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    branch_count = db.query(Branch).filter(Branch.school_id == school.id).count()
    return _school_to_dict(school, branch_count)


@router.patch("/schools/me")
def update_my_school(
    data: SchoolUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    if data.name is not None:
        school.name = data.name
    if data.address is not None:
        school.address = data.address
    if data.phone is not None:
        school.phone = data.phone
    if data.email is not None:
        school.email = data.email
    if data.motto is not None:
        school.motto = data.motto
    db.commit()
    db.refresh(school)
    branch_count = db.query(Branch).filter(Branch.school_id == school.id).count()
    return _school_to_dict(school, branch_count)


@router.get("/schools")
def list_schools(
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    q = db.query(School).execution_options(include_deleted=True)
    if search:
        s = f"%{search}%"
        q = q.filter(School.name.ilike(s) | School.code.ilike(s))
    total = q.count()
    schools = q.order_by(School.created_at.desc()).offset(skip).limit(limit).all()

    # Batch-load branch counts to avoid N+1 queries
    school_ids = [s.id for s in schools]
    branch_counts = db.query(Branch.school_id, func.count(Branch.id)).filter(
        Branch.school_id.in_(school_ids)
    ).group_by(Branch.school_id).all() if school_ids else []
    branch_count_map = {sid: count for sid, count in branch_counts}

    result = []
    for school in schools:
        branch_count = branch_count_map.get(school.id, 0)
        result.append(_school_to_dict(school, branch_count))
    return {"schools": result, "total": total}


@router.get("/schools/{school_id}")
def get_school(
    school_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    school = db.query(School).filter(School.id == school_id).execution_options(include_deleted=True).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    branch_count = db.query(Branch).filter(Branch.school_id == school.id).execution_options(include_deleted=True).count()
    return _school_to_dict(school, branch_count)
