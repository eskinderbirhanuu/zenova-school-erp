"""Password Recovery Service — offline-safe enterprise password recovery.

Supports recovery without email, SMS, or internet by using a hierarchy-based
approval chain: Super Admin → Recovery Codes, School Owner → Super Admin,
Director → School Owner/Admin, Admin → Director, down to Student → Registrar.

Future providers (Email, SMS, 2FA) can be plugged in via the abstract base
classes at the bottom of this module without changing the core flow.
"""
import logging
import secrets
import hashlib
import hmac as _hmac
import time as _time
from datetime import datetime, timedelta, timezone
from typing import Optional, Protocol

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.core.security import get_password_hash, verify_password, validate_password_strength
from app.models.user import User
from app.models.role import Role
from app.models.password_recovery import PasswordResetRequest, RecoveryCode, PasswordAudit
from app.models.audit_log import AuditLog
from app.services.auth_service import reset_password as _reset_password, _record_password_history
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.core.error_codes import ErrorCode

logger = logging.getLogger(__name__)

# ─── Recovery Hierarchy ──────────────────────────────────────────────
# Maps user level → who can reset them
# Levels: SUPER_ADMIN(0), OWNER(1), DIRECTOR(2), ADMIN(3),
#         FINANCE(4), TEACHER(4), REGISTRAR(4), LIBRARIAN(4),
#         STORE_MANAGER(4), CAFETERIA_MANAGER(4),
#         STUDENT(5), PARENT(5)

RECOVERY_HIERARCHY: dict[str, list[str]] = {
    "SUPER_ADMIN": ["SUPER_ADMIN"],  # self via recovery codes + key
    "SCHOOL_OWNER": ["SUPER_ADMIN"],
    "DIRECTOR": ["SCHOOL_OWNER", "ADMIN"],
    "ADMIN": ["DIRECTOR"],
    "FINANCE": ["ADMIN"],
    "TEACHER": ["ADMIN"],
    "REGISTRAR": ["ADMIN"],
    "LIBRARIAN": ["ADMIN"],
    "STORE_MANAGER": ["ADMIN"],
    "CAFETERIA_MANAGER": ["ADMIN"],
    "STUDENT": ["REGISTRAR", "ADMIN"],
    "PARENT": ["REGISTRAR", "ADMIN"],
}


def get_user_role_name(user: User) -> str | None:
    if user.is_superuser:
        return "SUPER_ADMIN"
    if user.role:
        return user.role.name.upper()
    role_names = user.get_role_names()
    if role_names:
        return role_names[0]
    return None


def get_role_level(role_name: str) -> int:
    levels = {
        "SUPER_ADMIN": 0,
        "SCHOOL_OWNER": 1,
        "DIRECTOR": 2,
        "ADMIN": 3,
        "FINANCE": 4,
        "TEACHER": 4,
        "REGISTRAR": 4,
        "LIBRARIAN": 4,
        "STORE_MANAGER": 4,
        "CAFETERIA_MANAGER": 4,
        "STUDENT": 5,
        "PARENT": 5,
    }
    return levels.get(role_name.upper(), 99)


def can_initiator_reset(initiator_role: str, target_role: str) -> bool:
    """Check if initiator_role is allowed to reset target_role."""
    allowed_initiators = RECOVERY_HIERARCHY.get(target_role.upper(), [])
    return initiator_role.upper() in allowed_initiators


# ─── Auditing ────────────────────────────────────────────────────────


def _log_password_audit(
    db: Session,
    action: str,
    target_user_id: str,
    school_id: str | None = None,
    initiated_by_user_id: str | None = None,
    approved_by_user_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    reason: str | None = None,
    metadata_json: str | None = None,
):
    entry = PasswordAudit(
        school_id=school_id,
        action=action,
        target_user_id=target_user_id,
        initiated_by_user_id=initiated_by_user_id,
        approved_by_user_id=approved_by_user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        reason=reason,
        metadata_json=metadata_json,
    )
    db.add(entry)
    # Also log to the main audit log for unified search
    audit = AuditLog(
        school_id=school_id,
        table_name="password_audit",
        record_id=target_user_id,
        action=action,
        user_id=initiated_by_user_id or target_user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        new_data={"reason": reason, "approved_by": approved_by_user_id},
    )
    db.add(audit)
    db.commit()


# ─── Temporary Password ──────────────────────────────────────────────


def generate_temp_password(length: int = 16) -> str:
    """Generate a cryptographically secure temporary password."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*"
    return "".join(secrets.choice(chars) for _ in range(length))


def admin_generate_temp_password(
    db: Session,
    target_user_id: str,
    initiated_by_user: User,
    reason: str = "Admin-initiated password reset",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Admin generates a temporary password for a target user."""
    from app.models.user import User as UserModel
    target = db.query(UserModel).filter(
        UserModel.id == target_user_id,
        UserModel.is_active == True,
        UserModel.deleted_at.is_(None),
    ).first()
    if not target:
        raise NotFoundException("Target user not found or inactive", code=ErrorCode.NOT_FOUND_USER)

    initiator_role = get_user_role_name(initiated_by_user)
    target_role = get_user_role_name(target)
    if not can_initiator_reset(initiator_role or "", target_role or ""):
        raise PermissionError(
            f"{initiator_role} cannot reset password for {target_role}. "
            f"Required one of: {RECOVERY_HIERARCHY.get(target_role or '', ['?'])}"
        )

    temp_pw = generate_temp_password()
    temp_hash = get_password_hash(temp_pw)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    request = PasswordResetRequest(
        user_id=target_user_id,
        initiated_by=initiated_by_user.id,
        method="admin",
        status="approved",
        temp_password_hash=temp_hash,
        token_expires_at=expires_at,
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(request)
    db.flush()

    target.must_change_password = True
    target.hashed_password = temp_hash
    _record_password_history(db, target.id, temp_hash)
    db.commit()

    _log_password_audit(
        db, "temp_password_generated", target_user_id,
        school_id=target.school_id,
        initiated_by_user_id=initiated_by_user.id,
        ip_address=ip_address, user_agent=user_agent, reason=reason,
    )

    return {
        "temp_password": temp_pw,
        "expires_at": expires_at,
        "request_id": request.id,
        "must_change_on_login": True,
    }


# ─── Recovery Codes ──────────────────────────────────────────────────


def _hash_recovery_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def generate_recovery_codes(
    db: Session,
    user: User,
    count: int = 10,
    ip_address: str | None = None,
) -> list[str]:
    """Generate single-use recovery codes for a user. Returns plaintext codes."""
    codes: list[str] = []
    for _ in range(count):
        code = "".join(secrets.choice("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(8))
        code_str = "-".join([code[i:i+4] for i in range(0, len(code), 4)])
        codes.append(code_str)

    for code_str in codes:
        clean = code_str.replace("-", "")
        entry = RecoveryCode(
            user_id=user.id,
            code_hash=_hash_recovery_code(clean),
            code_prefix=clean[:8],
            expires_at=datetime.now(timezone.utc) + timedelta(days=365),
        )
        db.add(entry)

    db.commit()

    _log_password_audit(
        db, "recovery_codes_generated", user.id,
        school_id=user.school_id,
        initiated_by_user_id=user.id,
        ip_address=ip_address,
    )

    return codes


def verify_recovery_code(
    db: Session,
    code: str,
    user_id: str,
    ip_address: str | None = None,
) -> bool:
    """Verify and consume a recovery code. Returns True if valid."""
    clean = code.replace("-", "").strip()
    code_hash = _hash_recovery_code(clean)

    entry = db.query(RecoveryCode).filter(
        RecoveryCode.user_id == user_id,
        RecoveryCode.code_hash == code_hash,
        RecoveryCode.is_used == False,
        RecoveryCode.deleted_at.is_(None),
    ).first()

    if not entry:
        return False

    if entry.expires_at and entry.expires_at < datetime.now(timezone.utc):
        return False

    entry.is_used = True
    entry.used_at = datetime.now(timezone.utc)
    entry.used_by_ip = ip_address
    db.commit()

    _log_password_audit(
        db, "recovery_code_verified", user_id,
        initiated_by_user_id=user_id,
        ip_address=ip_address,
    )

    return True


def list_recovery_codes(db: Session, user: User) -> list[dict]:
    """List recovery codes for a user (masked)."""
    entries = db.query(RecoveryCode).filter(
        RecoveryCode.user_id == user.id,
        RecoveryCode.deleted_at.is_(None),
    ).order_by(RecoveryCode.created_at.asc()).all()

    return [
        {
            "id": e.id,
            "prefix": e.code_prefix,
            "is_used": e.is_used,
            "created_at": e.created_at,
            "expires_at": e.expires_at,
        }
        for e in entries
    ]


# ─── Emergency Recovery (Offline Token) ──────────────────────────────


def _emergency_secret() -> bytes:
    return hashlib.sha256(("emergency:" + settings.secret_key).encode()).digest()


def generate_emergency_token(target_user_id: str, ttl_seconds: int = 3600) -> str:
    """Generate an emergency recovery token for offline (Ubuntu) use.
    Format: <user_id>.<exp_epoch>.<hmac_hex>
    """
    exp = int(_time.time()) + ttl_seconds
    msg = f"{target_user_id}.{exp}".encode()
    sig = _hmac.new(_emergency_secret(), msg, hashlib.sha256).hexdigest()
    return f"{target_user_id}.{exp}.{sig}"


def verify_emergency_token(token: str) -> tuple[bool, str]:
    """Verify an emergency token. Returns (is_valid, user_id)."""
    if not token:
        return False, ""
    parts = token.split(".")
    if len(parts) != 3:
        return False, ""
    uid, exp_str, sig = parts
    try:
        exp = int(exp_str)
    except ValueError:
        return False, ""
    if exp < _time.time():
        return False, ""
    msg = f"{uid}.{exp}".encode()
    expected = _hmac.new(_emergency_secret(), msg, hashlib.sha256).hexdigest()
    if not _hmac.compare_digest(sig, expected):
        return False, ""
    return True, uid


# ─── Recovery Request Lifecycle ──────────────────────────────────────


def initiate_recovery_request(
    db: Session,
    identifier: str,
    reason: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Initiate an offline-safe recovery request by email or employee_id."""
    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(
        UserModel.deleted_at.is_(None),
        UserModel.is_active == True,
    ).filter(
        (UserModel.email == identifier) | (UserModel.employee_id == identifier)
    ).first()

    if not user:
        return {
            "message": "If the account exists, recovery instructions are shown",
            "request_id": None,
            "requires_approval": False,
            "alternative_method": None,
        }

    role_name = get_user_role_name(user)
    allowed_initiators = RECOVERY_HIERARCHY.get(role_name or "", [])

    request = PasswordResetRequest(
        user_id=user.id,
        method="admin",
        status="pending",
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(request)
    db.commit()

    _log_password_audit(
        db, "reset_requested", user.id,
        school_id=user.school_id,
        ip_address=ip_address, user_agent=user_agent, reason=reason,
    )

    return {
        "message": f"Recovery initiated for {user.full_name}. "
                   f"This must be approved by: {', '.join(allowed_initiators) if allowed_initiators else 'a higher authority'}",
        "request_id": request.id,
        "requires_approval": True,
        "alternative_method": "recovery_code" if role_name == "SUPER_ADMIN" else None,
        "target_user_name": user.full_name,
    }


def approve_recovery_request(
    db: Session,
    request_id: str,
    approver: User,
    approved: bool = True,
    reason: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Approve or reject a recovery request."""
    req = db.query(PasswordResetRequest).filter(
        PasswordResetRequest.id == request_id,
        PasswordResetRequest.status == "pending",
        PasswordResetRequest.deleted_at.is_(None),
    ).first()
    if not req:
        raise ValueError("Recovery request not found or already processed")

    from app.models.user import User as UserModel
    target = db.query(UserModel).filter(UserModel.id == req.user_id).first()
    if not target:
        raise ValueError("Target user not found")

    initiator_role = get_user_role_name(approver)
    target_role = get_user_role_name(target)
    if not can_initiator_reset(initiator_role or "", target_role or ""):
        raise PermissionError(
            f"{initiator_role} cannot approve recovery for {target_role}"
        )

    if approved:
        temp_pw = generate_temp_password()
        temp_hash = get_password_hash(temp_pw)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        req.status = "approved"
        req.approved_by = approver.id
        req.temp_password_hash = temp_hash
        req.token_expires_at = expires_at
        req.reason = reason or req.reason

        target.must_change_password = True
        target.hashed_password = temp_hash
        _record_password_history(db, target.id, temp_hash)
        db.commit()

        _log_password_audit(
            db, "reset_completed", target.id,
            school_id=target.school_id,
            initiated_by_user_id=req.initiated_by,
            approved_by_user_id=approver.id,
            ip_address=ip_address, user_agent=user_agent, reason=reason,
        )

        return {"approved": True, "temp_password": temp_pw, "expires_at": expires_at, "must_change_on_login": True}
    else:
        req.status = "cancelled"
        req.reason = reason or req.reason
        db.commit()

        _log_password_audit(
            db, "reset_rejected", target.id,
            school_id=target.school_id,
            initiated_by_user_id=req.initiated_by,
            approved_by_user_id=approver.id,
            ip_address=ip_address, reason=reason,
        )

        return {"approved": False, "message": "Recovery request rejected"}


def apply_recovery_password(
    db: Session,
    request_id: str,
    new_password: str,
    confirm_password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Set a new password for a completed/approved recovery request."""
    if new_password != confirm_password:
        raise ValueError("Passwords do not match")

    valid, msg = validate_password_strength(new_password)
    if not valid:
        raise ValueError(msg)

    req = db.query(PasswordResetRequest).filter(
        PasswordResetRequest.id == request_id,
        PasswordResetRequest.status.in_(["approved", "pending"]),
        PasswordResetRequest.deleted_at.is_(None),
    ).first()
    if not req:
        raise ValueError("Recovery request not found or expired")

    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(UserModel.id == req.user_id).first()
    if not user:
        raise ValueError("User not found")

    if verify_password(new_password, user.hashed_password):
        raise ValueError("New password must be different from current")

    _reset_password(db, req.user_id, new_password)

    req.status = "completed"
    req.completed_at = datetime.now(timezone.utc)
    req.temp_password_hash = None
    db.commit()

    _log_password_audit(
        db, "reset_completed", req.user_id,
        school_id=user.school_id,
        initiated_by_user_id=req.initiated_by,
        approved_by_user_id=req.approved_by,
        ip_address=ip_address, user_agent=user_agent,
    )

    return {"success": True, "message": "Password has been reset successfully"}


def emergency_apply(
    db: Session,
    token: str,
    new_password: str,
    confirm_password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Apply emergency recovery via offline token."""
    if new_password != confirm_password:
        raise ValueError("Passwords do not match")

    valid, msg = validate_password_strength(new_password)
    if not valid:
        raise ValueError(msg)

    is_valid, user_id = verify_emergency_token(token)
    if not is_valid:
        raise ValueError("Invalid or expired emergency token")

    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.deleted_at.is_(None),
    ).first()
    if not user:
        raise ValueError("User not found")

    _reset_password(db, user_id, new_password)

    _log_password_audit(
        db, "emergency_recovery", user_id,
        school_id=user.school_id,
        initiated_by_user_id=user_id,
        ip_address=ip_address, user_agent=user_agent,
        reason="Emergency offline recovery",
    )

    return {"success": True, "message": "Emergency password reset successful"}


def list_audit_log(
    db: Session,
    target_user_id: str | None = None,
    action: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List password audit entries."""
    query = db.query(PasswordAudit).filter(PasswordAudit.deleted_at.is_(None))
    if target_user_id:
        query = query.filter(PasswordAudit.target_user_id == target_user_id)
    if action:
        query = query.filter(PasswordAudit.action == action)

    total = query.count()
    entries = query.order_by(PasswordAudit.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "entries": [
            {
                "id": e.id,
                "action": e.action,
                "target_user_id": e.target_user_id,
                "initiated_by_user_id": e.initiated_by_user_id,
                "approved_by_user_id": e.approved_by_user_id,
                "ip_address": e.ip_address,
                "reason": e.reason,
                "created_at": e.created_at,
            }
            for e in entries
        ],
        "total": total,
    }


# ─── Future Provider Interfaces ──────────────────────────────────────
# These abstract classes define the contract for future email, SMS, and
# 2FA-based password reset providers. No implementation is provided here;
# wire them in by subclassing and registering with Router.


class EmailResetProvider(Protocol):
    """Future: send password reset via email.

    To implement:
        1. Subclass this protocol.
        2. Implement send_reset_email().
        3. Register in the password recovery router.
    """

    def send_reset_email(self, email: str, reset_link: str) -> bool:
        """Send a reset link to the user's email. Return True on success."""
        ...


class SMSResetProvider(Protocol):
    """Future: send password reset via SMS.

    To implement:
        1. Subclass this protocol.
        2. Implement send_reset_sms().
        3. Register in the password recovery router.
    """

    def send_reset_sms(self, phone: str, reset_code: str) -> bool:
        """Send a reset code via SMS. Return True on success."""
        ...


class TwoFAResetProvider(Protocol):
    """Future: 2FA-backed password reset.

    To implement:
        1. Subclass this protocol.
        2. Implement verify_2fa_and_reset().
        3. Register in the password recovery router.
    """

    def verify_2fa_and_reset(self, user_id: str, otp: str, new_password: str) -> bool:
        """Verify a 2FA code and reset the password. Return True on success."""
        ...
