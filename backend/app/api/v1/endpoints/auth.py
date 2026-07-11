from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
    MFALoginRequest,
    MFADisableRequest,
    MFABackupCodesResponse,
)
from app.services import auth_service
from app.services import mfa_service
from app.config import settings as _settings
from app.api.v1.deps import (
    get_current_user, get_client_ip, get_user_agent,
    rate_limit, AUTH_RATE_LIMIT, LOGIN_RATE_LIMIT, API_RATE_LIMIT,
)
from app.models.user import User
from app.schemas.auth import MFASetupResponse

_COOKIE_SECURE = _settings.cookie_secure

router = APIRouter(tags=["auth"])

MAX_FAILED_PER_IP = _settings.brute_force_max_per_ip
MAX_FAILED_PER_ID = _settings.brute_force_max_per_id
LOCKOUT_SECONDS = _settings.brute_force_lockout_seconds
BRUTE_FORCE_KEY = "bruteforce"


def _check_brute_force(db: Session, ip: str, identifier: str) -> None:
    from app.core.redis_client import get_redis
    redis = get_redis()
    if redis is None:
        return
    ip_key = f"bf:ip:{ip}"
    id_key = f"bf:id:{identifier}"

    ip_count = redis.get(ip_key)
    if ip_count and int(ip_count) >= MAX_FAILED_PER_IP:
        ttl = redis.ttl(ip_key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts from this network. Try again in {ttl}s.",
            headers={"Retry-After": str(ttl)},
        )

    id_count = redis.get(id_key)
    if id_count and int(id_count) >= MAX_FAILED_PER_ID:
        ttl = redis.ttl(id_key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {ttl}s.",
            headers={"Retry-After": str(ttl)},
        )


def _record_failed_login(db: Session, ip: str, identifier: str) -> None:
    from app.core.redis_client import get_redis
    redis = get_redis()
    if redis is None:
        return
    try:
        ip_key = f"bf:ip:{ip}"
        id_key = f"bf:id:{identifier}"
        redis.incr(ip_key)
        redis.expire(ip_key, LOCKOUT_SECONDS)
        redis.incr(id_key)
        redis.expire(id_key, LOCKOUT_SECONDS)
    except Exception:
        pass
    auth_service.log_security_event(db, identifier, "LOGIN_FAILED", ip_address=ip)


def _clear_brute_force(redis, ip: str, identifier: str) -> None:
    try:
        redis.delete(f"bf:ip:{ip}")
        redis.delete(f"bf:id:{identifier}")
    except Exception:
        pass


def _blacklist_token(redis, jti: str, exp: int) -> None:
    try:
        ttl = max(exp - int(datetime.now(timezone.utc).timestamp()), 1)
        redis.setex(f"token:bl:{jti}", ttl, "1")
    except Exception:
        pass


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    response: Response,
    data: LoginRequest,
    db: Session = Depends(get_db),
    ip: str = Depends(LOGIN_RATE_LIMIT),
):
    identifier = data.email or data.employee_id or "unknown"
    _check_brute_force(db, ip, identifier)

    user = auth_service.authenticate_user(
        db,
        email=data.email,
        employee_id=data.employee_id,
        password=data.password,
    )
    if not user:
        _record_failed_login(db, ip, identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/employee_id or password",
        )

    from app.core.redis_client import get_redis
    redis = get_redis()
    if redis:
        _clear_brute_force(redis, ip, identifier)

    role_name = auth_service.get_user_role_name(user)

    if not user.mfa_enabled and mfa_service.mfa_required_for_role(role_name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA is required for your role. Please enable MFA before logging in.",
        )

    if user.mfa_enabled:
        mfa_token = auth_service.create_mfa_token({"sub": user.id, "role": role_name})
        return TokenResponse(
            mfa_required=True,
            mfa_token=mfa_token,
            employee_id=user.employee_id,
            role_name=role_name,
        )

    access_token = auth_service.create_access_token({"sub": user.id, "role": role_name})
    refresh_token_str = auth_service.create_refresh_token({"sub": user.id})

    auth_service.update_last_login(db, user.id)
    auth_service.log_login_audit(
        db, user.id, "LOGIN",
        ip_address=ip,
        user_agent=get_user_agent(request),
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 30,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    response.set_cookie(
        key="user_role",
        value=role_name,
        httponly=False,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )

    return TokenResponse(
        access_token=None,
        refresh_token=None,
        employee_id=user.employee_id,
        role_name=role_name,
    )


@router.post("/register", response_model=UserResponse)
def register(
    request: Request,
    data: RegisterRequest,
    db: Session = Depends(get_db),
    _ip: str = Depends(AUTH_RATE_LIMIT),
):
    from app.core.security import validate_password_strength
    from app.models.role import Role

    # Privilege-escalation guard: public self-registration may only assign
    # low-privilege roles. Any privileged role_id is rejected.
    SAFE_SELF_REGISTER_ROLES = {"PARENT", "STUDENT"}
    role_id = data.role_id
    if role_id:
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        if role.name not in SAFE_SELF_REGISTER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Self-registration is restricted to PARENT/STUDENT roles",
            )

    valid, msg = validate_password_strength(data.password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    existing = auth_service.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = auth_service.create_user(
        db,
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        phone=data.phone,
        role_id=role_id,
        school_id=data.school_id,
        branch_id=data.branch_id,
    )
    auth_service.log_login_audit(
        db, user.id, "REGISTER",
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        is_view_only=user.is_view_only,
        role_id=user.role_id,
        role_name=auth_service.get_user_role_name(user),
        school_id=user.school_id,
        branch_id=user.branch_id,
        created_at=user.created_at,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response, data: RefreshRequest, db: Session = Depends(get_db), _: None = Depends(AUTH_RATE_LIMIT)):
    token = data.refresh_token or request.cookies.get("refresh_token", "")
    payload = auth_service.decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
        from app.core.redis_client import get_redis
        from app.core.auth_deps import _is_token_blacklisted
        redis = get_redis()
        jti = payload.get("jti", "")
        user_id = payload.get("sub")

        # ── Refresh Token Rotation + Reuse Detection ──────────────
    # Each refresh token belongs to a "family" identified by the user id.
    # Redis stores the current (latest) jti for the family under `rtf:{user_id}`.
    # If an old (already-blacklisted) refresh token is presented, we detect
    # reuse and invalidate the entire family — the attacker's stolen token
    # cannot be used, but also the legitimate user is forced to re-login.
    if redis:
        family_key = f"rtf:{user_id}"
        current_jti = redis.get(family_key)

        if _is_token_blacklisted(jti):
            # This jti was already consumed — possible token reuse attack.
            # Invalidate the entire family so the old token is useless.
            if current_jti:
                _blacklist_token(redis, current_jti, payload.get("exp", 0))
            redis.delete(family_key)
            from app.services import auth_service as _as
            _as.log_security_event(db, user_id or "unknown", "REFRESH_REUSE_DETECTED")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked — possible token reuse detected. Please log in again.",
            )

        # Blacklist the old token (standard rotation)
        _blacklist_token(redis, jti, payload.get("exp", 0))

    user = auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    new_access = auth_service.create_access_token({"sub": user.id, "role": auth_service.get_user_role_name(user)})
    new_refresh = auth_service.create_refresh_token({"sub": user.id})
    new_jti = auth_service.decode_token(new_refresh).get("jti", "")

    # Store the new refresh token's jti as the current family member
    if redis and new_jti:
        redis.setex(family_key, 60 * 60 * 24 * 7, new_jti)

    role_name = auth_service.get_user_role_name(user)
    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 30,
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    response.set_cookie(
        key="user_role",
        value=role_name,
        httponly=False,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    return TokenResponse(access_token=None, refresh_token=None, role_name=role_name)


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.core.redis_client import get_redis
    auth_service.log_login_audit(
        db, current_user.id, "LOGOUT",
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    redis = get_redis()

    # Blacklist both access and refresh tokens so they cannot be reused.
    for cookie_name in ("access_token", "refresh_token"):
        token = request.cookies.get(cookie_name, "")
        if token and redis:
            payload = auth_service.decode_token(token)
            if payload:
                jti = payload.get("jti", "")
                exp = payload.get("exp")
                if jti and exp is not None:
                    _blacklist_token(redis, jti, exp)

    if current_user.id and redis:
        try:
            redis.delete(f"session:{current_user.id}")
        except Exception:
            pass

    response.set_cookie(key="access_token", value="", httponly=True, secure=_COOKIE_SECURE, samesite="strict", path="/", max_age=0)
    response.set_cookie(key="refresh_token", value="", httponly=True, secure=_COOKIE_SECURE, samesite="strict", path="/", max_age=0)
    response.set_cookie(key="user_role", value="", httponly=False, secure=_COOKIE_SECURE, samesite="strict", path="/", max_age=0)
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    _ip: str = Depends(AUTH_RATE_LIMIT),
):
    from app.core.security import create_password_reset_token, validate_password_strength
    ip = get_client_ip(request)
    user = auth_service.get_user_by_email(db, data.email)
    # Always return the same message to avoid user-enumeration via timing or 404.
    generic = {"message": "If the email exists, a reset link has been sent"}
    if not user:
        return generic
    reset_token = create_password_reset_token({"sub": user.id})
    reset_link = f"{_get_base_url()}/reset-password?token={reset_token}"
    from app.services.email_service import send_email
    send_email(
        to_email=user.email,
        subject="Password Reset — ZENOVA",
        body_text=f"You requested a password reset. If this was not you, ignore this email.\nReset link (expires in 15 min): {reset_link}",
        body_html=(
            "<p>You requested a password reset.</p>"
            "<p>If this was not you, you can safely ignore this email.</p>"
            f"<p>Reset link (expires in 15 minutes): <a href='{reset_link}'>reset password</a></p>"
        ),
    )
    auth_service.log_security_event(db, user.id, "PASSWORD_RESET_REQUESTED", ip_address=ip)
    return generic


def _get_base_url() -> str:
    import os
    return os.getenv("FRONTEND_URL", "http://localhost:3000")


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _ip: str = Depends(AUTH_RATE_LIMIT),
):
    from app.core.security import validate_password_strength
    from app.core.redis_client import get_redis
    payload = auth_service.decode_token(data.token)
    if payload is None or payload.get("type") != "password_reset" or payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    # One-time use: blacklist the reset token's jti for its remaining lifetime.
    jti = payload.get("jti", "")
    redis = get_redis()
    if redis and jti and redis.exists(f"token:bl:{jti}"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used",
        )
    valid, msg = validate_password_strength(data.password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    user_id = payload.get("sub")
    try:
        auth_service.reset_password(db, user_id, data.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if redis and jti and "exp" in payload:
        _blacklist_token(redis, jti, payload["exp"])
    auth_service.log_security_event(db, user_id, "PASSWORD_RESET", ip_address=None)
    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        employee_id=current_user.employee_id,
        full_name=current_user.full_name,
        phone=current_user.phone,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        is_view_only=current_user.is_view_only,
        role_id=current_user.role_id,
        role_name=auth_service.get_user_role_name(current_user),
        school_id=current_user.school_id,
        branch_id=current_user.branch_id,
        created_at=current_user.created_at,
    )


@router.get("/me/employee-id", response_model=dict)
def get_employee_id(current_user: User = Depends(get_current_user)):
    return {"employee_id": current_user.employee_id}


# ── MFA routes ──────────────────────────────────────────────────────────────


@router.post("/mfa/setup", response_model=MFASetupResponse)
def mfa_setup(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a TOTP secret and return the provisioning URI.

    MFA is NOT enabled yet — call ``POST /auth/mfa/verify`` with a code to
    confirm the secret was scanned correctly.
    """
    if current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="MFA is already enabled")
    result = mfa_service.initiate_mfa_setup(db, current_user)
    return MFASetupResponse(
        secret=result["secret"],
        qr_code_url=result["qr_code_url"],
        backup_codes=[],
    )


@router.post("/mfa/verify", response_model=MFAVerifyResponse)
def mfa_verify(
    data: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a TOTP code and enable MFA.

    Returns backup codes that should be saved by the user.
    """
    if current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="MFA is already enabled")
    result = mfa_service.complete_mfa_setup(db, current_user, data.code)
    if result is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")
    return MFAVerifyResponse(backup_codes=result["backup_codes"])


@router.post("/mfa/disable")
def mfa_disable(
    data: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable MFA after verifying the current password."""
    from app.core.security import verify_password
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid password")
    mfa_service.disable_mfa(db, current_user)
    return {"message": "MFA disabled"}


@router.post("/mfa/backup-codes", response_model=MFABackupCodesResponse)
def mfa_regenerate_backup_codes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Regenerate backup codes (invalidates previous codes)."""
    if not current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA is not enabled")
    codes = mfa_service.regenerate_backup_codes(db, current_user)
    return MFABackupCodesResponse(backup_codes=codes)


@router.post("/mfa/login", response_model=TokenResponse)
def mfa_login(
    request: Request,
    response: Response,
    data: MFALoginRequest,
    db: Session = Depends(get_db),
    ip: str = Depends(LOGIN_RATE_LIMIT),
):
    """Complete the two-factor login by providing the MFA code.

    Requires the ``mfa_token`` returned from ``POST /auth/login`` when
    ``mfa_required`` is ``true``.
    """
    payload = auth_service.decode_token(data.mfa_token)
    if payload is None or payload.get("type") != "mfa_step_up":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired MFA token — please log in again",
        )
    identifier = payload.get("sub", "unknown")
    user = auth_service.get_user_by_id(db, identifier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    if not mfa_service.verify_mfa_code(user, data.mfa_code):
        auth_service.log_security_event(db, user.id, "MFA_FAILED", ip_address=ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )

    role_name = auth_service.get_user_role_name(user)
    access_token = auth_service.create_access_token({"sub": user.id, "role": role_name})
    refresh_token_str = auth_service.create_refresh_token({"sub": user.id})

    auth_service.update_last_login(db, user.id)
    auth_service.log_login_audit(
        db, user.id, "LOGIN_MFA",
        ip_address=ip,
        user_agent=get_user_agent(request),
    )

    response.set_cookie(
        key="access_token", value=access_token,
        httponly=True, secure=_COOKIE_SECURE, samesite="strict", path="/",
        max_age=60 * 30,
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token_str,
        httponly=True, secure=_COOKIE_SECURE, samesite="strict", path="/",
        max_age=60 * 60 * 24 * 7,
    )
    response.set_cookie(
        key="user_role", value=role_name,
        httponly=False, secure=_COOKIE_SECURE, samesite="strict", path="/",
        max_age=60 * 60 * 24 * 7,
    )

    return TokenResponse(
        access_token=None,
        refresh_token=None,
        employee_id=user.employee_id,
        role_name=role_name,
    )