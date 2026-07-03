"""ZENOVA License Server — Cloud License Management API

Deployed at: https://superadmin.free.nf
Manages school registration, license keys, subscriptions.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import schools, licenses, auth, admin, monitoring
from app.core.config import settings

app = FastAPI(
    title="ZENOVA License Server",
    version="1.0.0",
    description="Cloud license management for ZENOVA School ERP",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(licenses.router, prefix="/api/v1/license", tags=["license"])
app.include_router(schools.router, prefix="/api/v1/schools", tags=["schools"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])


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
    return {"status": "ok", "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}
