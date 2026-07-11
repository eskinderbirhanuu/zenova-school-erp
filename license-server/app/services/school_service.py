"""School registration and management (cloud side)."""
from datetime import datetime, timezone
from typing import Optional
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.models import School, SchoolTier

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def register_school(db: Session, name: str, email: str, password: str,
                    phone: Optional[str] = None, address: Optional[str] = None,
                    city: Optional[str] = None, country: Optional[str] = None) -> School:
    school = School(
        name=name,
        email=email,
        password_hash=_pwd_ctx.hash(password),
        phone=phone,
        address=address,
        city=city,
        country=country,
        tier=SchoolTier.TRIAL.value,
    )
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


def authenticate_school(db: Session, email: str, password: str) -> School | None:
    school = db.query(School).filter(School.email == email).first()
    if not school or not school.password_hash:
        return None
    if not _pwd_ctx.verify(password, school.password_hash):
        return None
    return school


def get_school(db: Session, school_id: str) -> Optional[School]:
    return db.query(School).filter(School.id == school_id).first()


def list_schools(db: Session, skip: int = 0, limit: int = 100) -> list:
    return db.query(School).offset(skip).limit(limit).all()


def count_schools(db: Session) -> int:
    return db.query(School).count()


def get_school_stats(db: Session) -> dict:
    total = count_schools(db)
    active = db.query(School).filter(School.is_active == True).count()
    by_tier = {}
    for tier in SchoolTier:
        c = db.query(School).filter(School.tier == tier.value).count()
        if c > 0:
            by_tier[tier.value] = c
    return {
        "total_schools": total,
        "active_schools": active,
        "by_tier": by_tier,
    }
