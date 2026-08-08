"""Core rate-limiting dependency — safe for use from other core modules without circular imports."""
from fastapi import Request
from app.core.auth_deps import get_client_ip
from app.core.exceptions import TooManyRequestsException
from app.core.constants import (
    AUTH_RATE_LIMIT_COUNT, AUTH_RATE_WINDOW,
    LOGIN_RATE_LIMIT_COUNT, LOGIN_RATE_WINDOW,
    API_RATE_LIMIT_COUNT, API_RATE_WINDOW,
)
from app.config import settings


def rate_limit_key(prefix: str, ip: str) -> str:
    return f"ratelimit:{prefix}:{ip}"


def _limit_for(prefix: str, default_count: int, default_window: int) -> tuple[int, int]:
    """Resolve per-prefix limits from settings when available, else defaults."""
    s = settings
    count = getattr(s, f"{prefix}_rate_limit", None)
    window = getattr(s, f"{prefix}_rate_window_seconds", None)
    if isinstance(count, int) and count > 0:
        default_count = count
    if isinstance(window, int) and window > 0:
        default_window = window
    return default_count, default_window


def rate_limit(prefix: str, limit: int, window_seconds: int):
    def _check(request: Request):
        from app.core.redis_client import get_redis
        ip = get_client_ip(request)
        key = rate_limit_key(prefix, ip)
        redis = get_redis()
        eff_limit, eff_window = _limit_for(prefix, limit, window_seconds)
        try:
            current = redis.get(key)
            if current is None:
                redis.setex(key, eff_window, 1)
            elif int(current) >= eff_limit:
                raise TooManyRequestsException(f"Rate limit exceeded. Try again in {eff_window}s.")
            else:
                redis.incr(key)
        except TooManyRequestsException:
            raise
        except Exception:
            pass
        return ip
    return _check


AUTH_RATE_LIMIT = rate_limit("auth", limit=AUTH_RATE_LIMIT_COUNT, window_seconds=AUTH_RATE_WINDOW)
LOGIN_RATE_LIMIT = rate_limit("login", limit=LOGIN_RATE_LIMIT_COUNT, window_seconds=LOGIN_RATE_WINDOW)
API_RATE_LIMIT = rate_limit("api", limit=API_RATE_LIMIT_COUNT, window_seconds=API_RATE_WINDOW)
