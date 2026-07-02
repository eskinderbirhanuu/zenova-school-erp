import os
import threading
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.api.v1.router import router as v1_router
from app.database import Base, engine, SessionLocal
from app.config import settings
from app.core.rate_limit_middleware import RateLimitMiddleware
from app.core.logging_config import configure_logging
from app.api.v1.endpoints.metrics import MetricsMiddleware

logger = configure_logging(settings.environment)

app = FastAPI(
    title="ZENOVA ERP",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.5:3000",
]
if os.getenv("ALLOWED_ORIGINS"):
    ALLOWED_ORIGINS.extend(os.getenv("ALLOWED_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-CSRF-Token", "X-Zenova-Build"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        if request.url.path.startswith("/api/") or request.url.path.startswith("/docs"):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "accelerometer=(), camera=(), microphone=(), geolocation=()"
            script_policy = "'self'" if settings.is_production else "'self' 'unsafe-eval'"
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                f"script-src {script_policy}; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://192.168.1.5:8000; "
                "frame-ancestors 'none';"
            )
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(MetricsMiddleware)


CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/refresh",
    "/api/v1/setup/status",
    "/api/v1/activate/validate",
    "/api/v1/activate/validate-type",
    "/api/v1/activate/status",
    "/api/v1/activate/recovery/issue",
    "/api/v1/activate/recovery/reset",
}
CSRF_EXEMPT_PREFIXES = ("/api/v1/auth/verify-super-admin",)


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        if request.url.path in CSRF_EXEMPT_PATHS:
            return await call_next(request)
        if any(request.url.path.startswith(p) for p in CSRF_EXEMPT_PREFIXES):
            return await call_next(request)
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid or missing CSRF token"},
            )
        response = await call_next(request)
        return response


app.add_middleware(CSRFMiddleware)

app.include_router(v1_router)


@app.middleware("http")
async def watermark_middleware(request: Request, call_next):
    """Add forensic watermark + request ID to all API responses."""
    import uuid
    from app.services.watermark import encrypt_watermark, get_watermark

    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["X-Zenova-Instance"] = encrypt_watermark(get_watermark())
        response.headers["X-Zenova-Build"] = os.environ.get("BUILD_ID", "0")
        response.headers["X-Request-ID"] = str(uuid.uuid4())[:8]
        response.headers["Server"] = "ZENOVA-SECURE"
    return response


@app.on_event("startup")
def startup():
    for origin in ALLOWED_ORIGINS:
        if origin == "*":
            raise RuntimeError("ALLOWED_ORIGINS must not contain wildcard '*'")
    try:
        from app.services.license_validator import validate_lic_file
        status = validate_lic_file()
        if not status.valid:
            logger.warning(".lic file validation: %s", status.message)
            logger.info("Falling back to DB license check...")
            try:
                from app.services.license_crypto import validate_license_at_startup
                db = SessionLocal()
                status2 = validate_license_at_startup(db)
                db.commit()
                logger.info("DB license check: %s", status2["message"])
            finally:
                db.close()
        else:
            logger.info("License validated via .lic file: %s", status.message)
    except Exception as e:
        logger.warning("License validation skipped (first run?): %s", e)

    _start_sync_worker()
    from app.core.scheduler import start_scheduler
    start_scheduler()


_sync_shutdown = threading.Event()
_sync_thread: threading.Thread | None = None


def _sync_worker_loop():
    if _sync_shutdown.wait(timeout=30):
        return
    while not _sync_shutdown.is_set():
        try:
            from app.database import SessionLocal
            from app.services.sync_service import process_queue
            db = SessionLocal()
            try:
                process_queue(db, limit=100)
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
        except Exception:
            pass
        if _sync_shutdown.wait(timeout=300):
            break


def _start_sync_worker():
    global _sync_thread
    _sync_thread = threading.Thread(target=_sync_worker_loop, daemon=True, name="sync-worker")
    _sync_thread.start()


@app.on_event("shutdown")
def shutdown():
    logger.info("Shutdown signal received — draining sync queue...")
    _sync_shutdown.set()
    if _sync_thread and _sync_thread.is_alive():
        _sync_thread.join(timeout=60)
    from app.core.scheduler import stop_scheduler
    stop_scheduler()
    from app.core.redis_client import close_redis
    close_redis()