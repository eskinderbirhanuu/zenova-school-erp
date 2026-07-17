from datetime import datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role
from app.models.staff_profile import StaffProfile
from app.core.security import get_password_hash
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.core.error_codes import ErrorCode
from app.core.audit import log_audit


ROLE_MAP = {
    "REGISTRAR": "REGISTRAR",
    "FINANCE": "FINANCE",
    "HR": "HR",
    "INVENTORY": "INVENTORY",
    "LIBRARY": "LIBRARY",
    "CAFETERIA": "CAFETERIA",
    "AUDITOR": "AUDITOR",
}


def create_staff(
    db: Session,
    staff_id: str,
    full_name: str,
    email: str,
    phone: str,
    role_name: str,
    password: str,
    department: str | None = None,
    employment_date: datetime | None = None,
    photo_url: str | None = None,
    school_id: str | None = None,
    branch_id: str | None = None,
    created_by: str | None = None,
    include_deleted: bool = False,
) -> dict:
    """Create staff (User + StaffProfile)"""
    if role_name not in ROLE_MAP:
        raise BadRequestException(f"Invalid staff role: {role_name}", code=ErrorCode.VALIDATION_INVALID_ENUM)

    q = db.query(User).filter(User.email == email)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    existing = q.first()
    if existing:
        raise ConflictException("Email already exists", code=ErrorCode.CONFLICT_DUPLICATE_EMAIL)

    staff_role = db.query(Role).filter(Role.name == role_name).first()
    if not staff_role:
        raise NotFoundException(f"{role_name} role not found. Run seed first.", code=ErrorCode.NOT_FOUND_ROLE)

    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        phone=phone,
        photo_url=photo_url,
        is_active=True,
        must_change_password=True,
        role_id=staff_role.id,
        school_id=school_id,
        branch_id=branch_id,
    )
    db.add(user)
    db.flush()

    profile = StaffProfile(
        user_id=user.id,
        staff_id=staff_id,
        department=department,
        employment_date=employment_date,
    )
    db.add(profile)
    log_audit(
        db=db,
        table_name="users",
        record_id=user.id,
        action="STAFF_CREATED",
        new_data={"email": email, "full_name": full_name, "staff_id": staff_id, "role": role_name},
        user_id=created_by,
        school_id=school_id,
    )
    db.commit()
    db.refresh(user)
    db.refresh(profile)

    return {"user": user, "profile": profile}


def list_staff(db: Session, school_id: str | None = None, role_name: str | None = None, include_deleted: bool = False) -> list[dict]:
    from app.models.staff_profile import StaffProfile
    query = db.query(User, StaffProfile).join(StaffProfile, User.id == StaffProfile.user_id).filter(User.is_active == True)
    if include_deleted:
        query = query.execution_options(include_deleted=True)
    if school_id:
        query = query.filter(User.school_id == school_id)
    if role_name:
        matching_role = db.query(Role).filter(Role.name == role_name).first()
        if matching_role:
            query = query.filter(User.role_id == matching_role.id)

    rows = query.all()

    role_ids = {user.role_id for user, _ in rows if user.role_id}
    roles = {r.id: r.name for r in db.query(Role).filter(Role.id.in_(role_ids)).all()} if role_ids else {}

    return [
        {
            "id": profile.id,
            "staff_id": profile.staff_id,
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role_name": roles.get(user.role_id) if user.role_id else "",
            "department": profile.department,
            "is_active": user.is_active,
        }
        for user, profile in rows
        if profile
    ]


def get_staff_by_user_id(db: Session, user_id: str) -> StaffProfile | None:
    return db.query(StaffProfile).filter(StaffProfile.user_id == user_id).first()


def get_staff_by_id(db: Session, profile_id: str, school_id: str, include_deleted: bool = False) -> dict | None:
    q = db.query(StaffProfile).filter(StaffProfile.id == profile_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    profile = q.first()
    if not profile:
        return None
    user = db.query(User).filter(User.id == profile.user_id, User.school_id == school_id).first()
    if not user:
        return None
    role = db.query(Role).filter(Role.id == user.role_id).first()
    return {
        "id": profile.id,
        "staff_id": profile.staff_id,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role_name": role.name if role else None,
        "department": profile.department,
        "employment_date": profile.employment_date,
        "photo_url": user.photo_url,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


def update_staff(db: Session, profile_id: str, school_id: str, data, user_id: str, include_deleted: bool = False) -> dict:
    q = db.query(StaffProfile).filter(StaffProfile.id == profile_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    profile = q.first()
    if not profile:
        raise NotFoundException("Staff not found")
    user = db.query(User).filter(User.id == profile.user_id, User.school_id == school_id).first()
    if not user:
        raise NotFoundException("Staff not found in this school")
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.id != user.id).first()
        if existing:
            raise ConflictException("Email already in use")
        user.email = data.email
    if data.phone is not None:
        user.phone = data.phone
    if data.photo_url is not None:
        user.photo_url = data.photo_url
    if data.department is not None:
        profile.department = data.department
    if data.employment_date is not None:
        profile.employment_date = data.employment_date
    log_audit(db, user_id, "STAFF_UPDATED", "staff_profiles", profile.id, f"Updated {user.full_name}", school_id=school_id)
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    role = db.query(Role).filter(Role.id == user.role_id).first()
    return {
        "id": profile.id,
        "staff_id": profile.staff_id,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role_name": role.name if role else None,
        "department": profile.department,
        "employment_date": profile.employment_date,
        "photo_url": user.photo_url,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


def deactivate_staff(db: Session, profile_id: str, school_id: str, user_id: str, include_deleted: bool = False):
    q = db.query(StaffProfile).filter(StaffProfile.id == profile_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    profile = q.first()
    if not profile:
        raise NotFoundException("Staff not found")
    user = db.query(User).filter(User.id == profile.user_id, User.school_id == school_id).first()
    if not user:
        raise NotFoundException("Staff not found in this school")
    user.is_active = False
    log_audit(db, user_id, "STAFF_DEACTIVATED", "users", user.id, f"Deactivated {user.full_name}", school_id=school_id)
    db.commit()
    return {"ok": True}
