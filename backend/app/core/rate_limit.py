"""Core rate-limiting dependency — safe for use from other core modules without circular imports."""
from fastapi import HTTPException, Request, status
from app.core.auth_deps import get_client_ip


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
