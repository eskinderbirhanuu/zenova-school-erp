import json
import hashlib
from functools import wraps
from typing import Optional, Callable
from fastapi import Request, Response
from app.core.redis_client import get_redis

CACHE_DEFAULT_TTL = 300


def _cache_key(prefix: str, method: str, path: str, query_params: str) -> str:
    raw = f"{prefix}:{method}:{path}:{query_params}"
    return f"cache:{hashlib.sha256(raw.encode()).hexdigest()}"


def _get_cached(key: str):
    r = get_redis()
    if r is None:
        return None
    return r.get(key)


def _set_cached(key: str, body: str, ttl: int):
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(key, ttl, body)
    except Exception:
        pass


def get_cached_or_compute(prefix: str, request: Request, func: Callable, *args, ttl_seconds: int = CACHE_DEFAULT_TTL, **kwargs):
    """Sync helper: return cached JSON Response or compute via func and cache it."""
    if request.method != "GET":
        return func(*args, **kwargs)

    key = _cache_key(prefix, request.method, request.url.path, str(sorted(request.query_params.items())))
    cached = _get_cached(key)
    if cached is not None:
        return Response(content=cached, media_type="application/json", headers={"X-Cache": "HIT"})

    result = func(*args, **kwargs)
    try:
        body = json.dumps(result) if not isinstance(result, (str, bytes)) else result
        _set_cached(key, body, ttl_seconds)
    except Exception:
        pass
    return result


def cache_response(prefix: str, ttl_seconds: int = CACHE_DEFAULT_TTL):
    """Decorator for async endpoints. Caches GET responses in Redis.

    Usage:
        @router.get("/students")
        @cache_response("students", ttl_seconds=60)
        async def list_students(...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = next((a for a in args if isinstance(a, Request)), None) or kwargs.get("request")
            if not request or request.method != "GET":
                return await func(*args, **kwargs)

            key = _cache_key(prefix, request.method, request.url.path, str(sorted(request.query_params.items())))
            cached = _get_cached(key)
            if cached is not None:
                return Response(content=cached, media_type="application/json", headers={"X-Cache": "HIT"})

            response = await func(*args, **kwargs)
            try:
                body = json.dumps(response) if not isinstance(response, (str, bytes)) else response
                _set_cached(key, body, ttl_seconds)
            except Exception:
                pass
            return response
        return wrapper
    return decorator


def invalidate_cache(prefix: str):
    """Delete all cache keys for a given prefix (pattern-delete).

    Usage:
        after creating a student:
            invalidate_cache("students")
    """
    r = get_redis()
    if r is None:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = r.scan(cursor=cursor, match=f"cache:{prefix}:*", count=100)
            if keys:
                r.delete(*keys)
            if cursor == 0:
                break
    except Exception:
        pass
