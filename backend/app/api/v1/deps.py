from fastapi import Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import decode_token, get_user_by_id
from app.models.user import User
from app.config import settings
from app.core.redis_client import get_redis
import ipaddress


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_user_agent(request: Request) -> str:
    return request.headers.get("User-Agent", "unknown")


def _is_token_blacklisted(jti: str) -> bool:
    """Check if a token JTI is blacklisted in Redis."""
    try:
        redis = get_redis()
        return redis.exists(f"token:bl:{jti}") == 1
    except Exception:
        return False


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token", "")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    jti = payload.get("jti")
    if jti and _is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def rate_limit_key(prefix: str, ip: str) -> str:
    return f"ratelimit:{prefix}:{ip}"


def rate_limit(prefix: str, limit: int, window_seconds: int):
    def _check(request: Request):
        from app.core.redis_client import get_redis
        ip = get_client_ip(request)
        key = rate_limit_key(prefix, ip)
        redis = get_redis()
        try:
            current = redis.get(key)
            if current is None:
                redis.setex(key, window_seconds, 1)
            elif int(current) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {window_seconds}s.",
                    headers={"Retry-After": str(window_seconds)},
                )
            else:
                redis.incr(key)
        except HTTPException:
            raise
        except Exception:
            pass
        return ip
    return _check


AUTH_RATE_LIMIT = rate_limit("auth", limit=10, window_seconds=60)
LOGIN_RATE_LIMIT = rate_limit("login", limit=5, window_seconds=300)
API_RATE_LIMIT = rate_limit("api", limit=200, window_seconds=60)


def require_csrf(request: Request, x_csrf_token: str = Header(None, alias="X-CSRF-Token")):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    csrf_cookie = request.cookies.get("csrf_token")
    if not x_csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing CSRF token",
        )
    if not csrf_cookie or x_csrf_token != csrf_cookie:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )


def require_licensed_feature(feature: str = "default"):
    async def _check(current_user: User = Depends(get_current_user)):
        from app.services.license_crypto import get_cached_license_status
        status_data = get_cached_license_status()
        if not status_data["valid"]:
            restrict_key = f"restrict_{feature}"
            if status_data.get(restrict_key, True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"View only mode. Cannot use {feature} without a valid license.",
                )
        return current_user
    return _check


def _ip_in_networks(ip_str: str, networks_csv: str) -> bool:
    if not networks_csv:
        return False
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    for cidr in networks_csv.split(","):
        cidr = cidr.strip()
        if not cidr:
            continue
        try:
            net = ipaddress.ip_network(cidr, strict=False)
            if addr in net:
                return True
        except ValueError:
            pass
    return False


def require_inside_network():
    """Mark the current user as view-only if their IP is outside trusted networks.

    Apply as a dependency on mutation endpoints.  If the server has
    ``trusted_networks`` configured and the client IP does not match,
    sets ``is_view_only = True`` on the user for this request (does
    not persist to DB).
    """
    def _check(request: Request, current_user: User = Depends(get_current_user)):
        if not settings.trusted_networks:
            return current_user
        ip = get_client_ip(request)
        if ip == "unknown":
            return current_user
        if _ip_in_networks(ip, settings.trusted_networks):
            return current_user
        current_user.is_view_only = True
        return current_user
    return _check