"""School registration and management endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import SchoolRegister, SchoolResponse
from app.services import school_service

router = APIRouter()


@router.post("/register", response_model=SchoolResponse)
def register(data: SchoolRegister, db: Session = Depends(get_db)):
    from app.services.license_service import create_license
    school = school_service.register_school(
        db, data.name, data.email, data.password,
        data.phone, data.address, data.city, data.country,
    )
    # Auto-generate trial license
    create_license(db, school.id, license_type="trial", max_users=30, max_branches=1)

    return SchoolResponse(
        id=school.id,
        name=school.name,
        email=school.email,
        tier=school.tier,
        is_active=school.is_active,
        registered_at=school.registered_at.isoformat(),
    )


@router.get("/{school_id}")
def get_school(school_id: str, db: Session = Depends(get_db)):
    school = school_service.get_school(db, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return SchoolResponse(
        id=school.id,
        name=school.name,
        email=school.email,
        tier=school.tier,
        is_active=school.is_active,
        registered_at=school.registered_at.isoformat(),
    )


@router.get("")
def list_schools(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    schools = school_service.list_schools(db, skip, limit)
    return {
        "schools": [
            SchoolResponse(
                id=s.id, name=s.name, email=s.email,
                tier=s.tier, is_active=s.is_active,
                registered_at=s.registered_at.isoformat(),
            ) for s in schools
        ],
        "total": len(schools),
    }
