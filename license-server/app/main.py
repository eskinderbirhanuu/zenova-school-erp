"""ZENOVA License Server — Cloud License Management API

Manages school registration, license keys, subscriptions.
"""
import logging
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import schools, licenses, auth, admin, monitoring
from app.core.config import settings
from app.database import engine, Base, get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Cache-Control"] = "no-store"
        return response


app = FastAPI(
    title="ZENOVA License Server",
    version="1.0.0",
    description="Cloud license management for ZENOVA School ERP",
)

origins = settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=("*" not in origins),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(licenses.router, prefix="/api/v1/license", tags=["license"])
app.include_router(schools.router, prefix="/api/v1/schools", tags=["schools"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "service": "ZENOVA License Server",
        "version": "1.0.0",
        "status": "operational",
    }


@app.get("/api/v1/license/ping")
def ping():
    """Used by local school servers to check connectivity."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/api/v1/heartbeat")
def heartbeat(data: dict, db=Depends(get_db)):
    """Receive heartbeat from school servers."""
    from app.models.models import HeartbeatEvent, School
    school_code = data.get("school_code", "")
    if not school_code:
        return JSONResponse(status_code=400, content={"detail": "school_code is required"})
    event = HeartbeatEvent(
        school_code=school_code,
        server_id=data.get("server_id", ""),
        version=data.get("version", ""),
        license_key=data.get("license_key", ""),
        reported_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.query(School).filter(School.id == school_code).update(
        {"last_sync_at": datetime.now(timezone.utc)}
    )
    db.commit()
    return {"status": "received", "timestamp": datetime.now(timezone.utc).isoformat()}
