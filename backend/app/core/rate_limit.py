"""Core rate-limiting dependency — safe for use from other core modules without circular imports."""
from fastapi import Request
from app.core.auth_deps import get_client_ip
from app.core.exceptions import TooManyRequestsException
from app.core.constants import (
    AUTH_RATE_LIMIT_COUNT, AUTH_RATE_WINDOW,
    LOGIN_RATE_LIMIT_COUNT, LOGIN_RATE_WINDOW,
    API_RATE_LIMIT_COUNT, API_RATE_WINDOW,
)


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
                raise TooManyRequestsException(f"Rate limit exceeded. Try again in {window_seconds}s.")
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
