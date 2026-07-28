"""ZENOVA License Server — Cloud License Management API

Deployed at: https://superadmin.free.nf
Manages school registration, license keys, subscriptions.
"""
from datetime import datetime, timezone
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import schools, licenses, auth, admin, monitoring
from app.core.config import settings
from app.database import engine, Base, get_db

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
    event = HeartbeatEvent(
        school_code=data.get("school_code", ""),
        server_id=data.get("server_id", ""),
        version=data.get("version", ""),
        license_key=data.get("license_key", ""),
        reported_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.query(School).filter(School.id == data.get("school_code")).update(
        {"last_sync_at": datetime.now(timezone.utc)}
    )
    db.commit()
    return {"status": "received", "timestamp": datetime.now(timezone.utc).isoformat()}
