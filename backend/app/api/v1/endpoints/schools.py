from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.school import School
from app.models.branch import Branch

router = APIRouter(tags=["schools"])


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
    result = []
    for school in schools:
        branch_count = db.query(Branch).filter(Branch.school_id == school.id).execution_options(include_deleted=True).count()
        result.append({
            "id": school.id,
            "name": school.name,
            "code": school.code,
            "address": school.address,
            "phone": school.phone,
            "email": school.email,
            "is_active": school.is_active,
            "is_setup_complete": school.is_setup_complete,
            "branch_count": branch_count,
            "created_at": school.created_at.isoformat() if school.created_at else None,
        })
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
    return {
        "id": school.id,
        "name": school.name,
        "code": school.code,
        "address": school.address,
        "phone": school.phone,
        "email": school.email,
        "is_active": school.is_active,
        "is_setup_complete": school.is_setup_complete,
        "branch_count": branch_count,
        "created_at": school.created_at.isoformat() if school.created_at else None,
    }
