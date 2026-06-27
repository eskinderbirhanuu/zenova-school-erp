from datetime import datetime, timedelta
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
)
from app.services import auth_service
from app.config import settings as _settings
from app.api.v1.deps import (
    get_current_user, get_client_ip, get_user_agent,
    rate_limit, AUTH_RATE_LIMIT, LOGIN_RATE_LIMIT, API_RATE_LIMIT,
)
from app.models.user import User

_COOKIE_SECURE = _settings.cookie_secure

router = APIRouter(tags=["auth"])

MAX_FAILED_PER_IP = 20
LOCKOUT_SECONDS = 900
BRUTE_FORCE_KEY = "bruteforce"


def _check_brute_force(db: Session, ip: str, identifier: str) -> None:
    from app.core.redis_client import get_redis
    redis = get_redis()
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
    if id_count and int(id_count) >= 5:
        ttl = redis.ttl(id_key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {ttl}s.",
            headers={"Retry-After": str(ttl)},
        )


def _record_failed_login(db: Session, ip: str, identifier: str) -> None:
    from app.core.redis_client import get_redis
    redis = get_redis()
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
        ttl = max(exp - int(datetime.utcnow().timestamp()), 1)
        redis.setex(f"token:bl:{jti}", ttl, "1")
    except Exception:
        pass


def _is_token_blacklisted(redis, jti: str) -> bool:
    try:
        return redis.exists(f"token:bl:{jti}") == 1
    except Exception:
        return False


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
    _clear_brute_force(redis, ip, identifier)

    role_name = auth_service.get_user_role_name(user)
    access_token = auth_service.create_access_token({"sub": user.id, "role": role_name})
    refresh_token_str = auth_service.create_refresh_token({"sub": user.id})
    access_payload = auth_service.decode_token(access_token)
    refresh_payload = auth_service.decode_token(refresh_token_str)

    if access_payload and refresh_payload:
        _blacklist_token(redis, access_payload["jti"], access_payload["exp"])
        _blacklist_token(redis, refresh_payload["jti"], refresh_payload["exp"])

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
        role_id=data.role_id,
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
def refresh_token(request: Request, response: Response, data: RefreshRequest, db: Session = Depends(get_db)):
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
    redis = get_redis()
    jti = payload.get("jti", "")
    if _is_token_blacklisted(redis, jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )
    _blacklist_token(redis, jti, payload["exp"])

    user_id = payload.get("sub")
    user = auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    new_access = auth_service.create_access_token({"sub": user.id, "role": auth_service.get_user_role_name(user)})
    new_refresh = auth_service.create_refresh_token({"sub": user.id})
    new_access_payload = auth_service.decode_token(new_access)
    new_refresh_payload = auth_service.decode_token(new_refresh)
    if new_access_payload and new_refresh_payload:
        _blacklist_token(redis, new_access_payload["jti"], new_access_payload["exp"])
        _blacklist_token(redis, new_refresh_payload["jti"], new_refresh_payload["exp"])

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
    if current_user.id:
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
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    _ip: str = Depends(AUTH_RATE_LIMIT),
):
    user = auth_service.get_user_by_email(db, data.email)
    if user:
        reset_token = auth_service.create_access_token(
            {"sub": user.id, "purpose": "password_reset"}
        )
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = auth_service.decode_token(data.token)
    if payload is None or payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    user_id = payload.get("sub")
    auth_service.reset_password(db, user_id, data.password)
    auth_service.log_security_event(db, user_id, "PASSWORD_RESET",
                                    ip_address=None)
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