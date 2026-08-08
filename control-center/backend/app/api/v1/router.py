from fastapi import APIRouter
from app.api.v1.endpoints import auth, customers, licenses, updates, monitoring, health, partners

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(customers.router, prefix="/customers", tags=["customers"])
router.include_router(licenses.router, prefix="/licenses", tags=["licenses"])
router.include_router(updates.router, prefix="/updates", tags=["updates"])
router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(partners.router, prefix="/public", tags=["public"])
