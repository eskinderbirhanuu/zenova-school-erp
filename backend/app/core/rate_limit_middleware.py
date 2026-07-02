from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.v1.deps import API_RATE_LIMIT

RATE_LIMIT_EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/refresh",
    "/api/v1/health/",
    "/api/v1/health/live",
    "/api/v1/health/ready",
    "/api/v1/setup/status",
    "/api/v1/activate/validate",
    "/api/v1/activate/status",
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/v1/"):
            return await call_next(request)
        if request.url.path in RATE_LIMIT_EXEMPT_PATHS:
            return await call_next(request)
        try:
            API_RATE_LIMIT(request)
        except HTTPException:
            raise
        except Exception:
            pass
        return await call_next(request)
