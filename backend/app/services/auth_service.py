from datetime import datetime, timedelta, timezone
import secrets
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.config import settings
from app.core.security import verify_password, get_password_hash, validate_password_strength
from app.models.user import User, PasswordHistory, PASSWORD_HISTORY_LIMIT
from app.models.role import Role
from app.models.audit_log import AuditLog
from app.services.sync_service import enqueue_sync
from app.core.exceptions import BadRequestException
from app.core.error_codes import ErrorCode


def authenticate_user(db: Session, email: str | None = None, employee_id: str | None = None, password: str = "") -> User | None:
    query = db.query(User).filter(User.is_active == True, User.deleted_at.is_(None))
    if employee_id:
        user = query.filter(User.employee_id == employee_id).first()
    else:
        user = query.filter(User.email == email).first() if email else None
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    phone: str | None = None,
    employee_id: str | None = None,
    role_id: str | None = None,
    school_id: str | None = None,
    branch_id: str | None = None,
    is_superuser: bool = False,
) -> User:
    user = User(
        email=email,
        employee_id=employee_id,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        phone=phone,
        role_id=role_id,
        school_id=school_id,
        branch_id=branch_id,
        is_superuser=is_superuser,
    )
    db.add(user)
    db.flush()
    _record_password_history(db, user.id, user.hashed_password)
    db.commit()
    db.refresh(user)
    enqueue_sync(db, "users", user.id, "CREATE",
                 {"email": email, "full_name": full_name, "employee_id": employee_id},
                 school_id, branch_id)
    return user


def _jwt_key() -> tuple[str, list[str]]:
    """Return (signing_key, algorithms) — RS256 if keys configured, else HS256."""
    if settings.jwt_private_key and settings.jwt_public_key:
        return settings.jwt_private_key, ["RS256"]
    return settings.secret_key, [settings.algorithm]


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access", "jti": secrets.token_hex(16)})
    signing_key, algos = _jwt_key()
    return jwt.encode(to_encode, signing_key, algorithm=algos[0])


def create_mfa_token(data: dict) -> str:
    """Short-lived JWT (5 min) used for MFA step-up during login."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    to_encode.update({"exp": expire, "type": "mfa_step_up", "jti": secrets.token_hex(16)})
    signing_key, algos = _jwt_key()
    return jwt.encode(to_encode, signing_key, algorithm=algos[0])


def create_refresh_token(data: dict) -> str:
    # IMPORTANT: jti is required so /refresh can revoke (blacklist) the previous token.
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh", "jti": secrets.token_hex(16)})
    signing_key, algos = _jwt_key()
    return jwt.encode(to_encode, signing_key, algorithm=algos[0])


def decode_token(token: str) -> dict | None:
    """Try RS256 first, fall back to HS256 for backward compatibility."""
    if settings.jwt_public_key:
        try:
            payload = jwt.decode(token, settings.jwt_public_key, algorithms=["RS256", "HS256"])
            return payload
        except JWTError:
            pass
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
        User.deleted_at.is_(None),
    ).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(
        User.email == email,
        User.deleted_at.is_(None),
    ).first()


def log_login_audit(
    db: Session,
    user_id: str,
    action: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
):
    audit = AuditLog(
        table_name="users",
        record_id=user_id,
        action=action,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        new_data={"action": action},
    )
    db.add(audit)
    db.commit()


def log_security_event(
    db: Session,
    identifier: str,
    action: str,
    ip_address: str | None = None,
):
    audit = AuditLog(
        table_name="users",
        record_id=identifier,
        action=f"SECURITY_{action}",
        user_id=identifier,
        ip_address=ip_address,
        user_agent=None,
        new_data={"action": action, "timestamp": datetime.now(timezone.utc).isoformat()},
    )
    db.add(audit)
    db.commit()


def update_last_login(db: Session, user_id: str):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()


def _check_password_history(db: Session, user_id: str, new_password: str):
    """Ensure new_password is not in the user's recent password history."""
    history = db.query(PasswordHistory).filter(
        PasswordHistory.user_id == user_id,
    ).order_by(PasswordHistory.created_at.desc()).limit(PASSWORD_HISTORY_LIMIT).all()
    for entry in history:
        if verify_password(new_password, entry.hashed_password):
            raise BadRequestException("Password has been used recently. Choose a different password.",
                                       code=ErrorCode.AUTH_PASSWORD_WEAK)


def _record_password_history(db: Session, user_id: str, hashed_password: str):
    """Record a password hash and prune old entries beyond the limit."""
    entry = PasswordHistory(user_id=user_id, hashed_password=hashed_password)
    db.add(entry)
    # Keep only the most recent PASSWORD_HISTORY_LIMIT entries
    old = db.query(PasswordHistory).filter(
        PasswordHistory.user_id == user_id,
    ).order_by(PasswordHistory.created_at.desc()).offset(PASSWORD_HISTORY_LIMIT).all()
    for o in old:
        db.delete(o)


def reset_password(db: Session, user_id: str, new_password: str):
    valid, msg = validate_password_strength(new_password)
    if not valid:
        raise BadRequestException(msg, code=ErrorCode.AUTH_PASSWORD_WEAK)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        if verify_password(new_password, user.hashed_password):
            raise BadRequestException("New password must be different from the current password",
                                       code=ErrorCode.VALIDATION_GENERIC)
        _check_password_history(db, user_id, new_password)
        new_hash = get_password_hash(new_password)
        user.hashed_password = new_hash
        user.must_change_password = False
        _record_password_history(db, user_id, new_hash)
        db.commit()


def authenticate_student_parent(db: Session, student_id_str: str, password: str) -> dict:
    from app.models.student import Student
    from app.models.parent_student_link import ParentStudentLink
    from app.models.parent import Parent
    student = db.query(Student).filter(
        Student.student_id == student_id_str, Student.status == "active"
    ).first()
    if not student:
        return {"valid": False, "message": "Student not found"}
    link = db.query(ParentStudentLink).filter(
        ParentStudentLink.student_id == student.id
    ).first()
    if not link:
        return {"valid": False, "message": "No parent linked to this student"}
    parent = db.query(Parent).filter(Parent.id == link.parent_id).first()
    if not parent or not parent.user_id:
        return {"valid": False, "message": "Parent has no user account"}
    user = db.query(User).filter(User.id == parent.user_id, User.is_active == True,
                                 User.deleted_at.is_(None)).first()
    if not user:
        return {"valid": False, "message": "Parent user account not found"}
    if not verify_password(password, user.hashed_password):
        return {"valid": False, "message": "Invalid password"}
    return {"valid": True, "user_id": user.id, "parent_id": parent.id, "student_id": student.id}


def get_user_role_name(user: User) -> str | None:
    """Return the primary role name (backward-compatible single role).

    Uses the original `role_id` FK if set, otherwise returns the first
    role from the many-to-many `user_roles` table.
    """
    if user.is_superuser:
        return "SUPER_ADMIN"
    if user.role:
        return user.role.name
    role_names = user.get_role_names()
    if role_names:
        return role_names[0]
    return None


def get_user_role_names(user: User) -> list[str]:
    """Return ALL role names for a user (multi-role support)."""
    if user.is_superuser:
        return ["SUPER_ADMIN"]
    from app.core.permissions import ROLE_PERMISSIONS
    names = user.get_role_names()
    if not names and user.role:
        names = [user.role.name]
    return names


def get_user_permissions_list(user: User) -> list[str]:
    """Return sorted list of all permissions for a user."""
    from app.core.permissions import get_user_permissions
    return sorted(get_user_permissions(user))