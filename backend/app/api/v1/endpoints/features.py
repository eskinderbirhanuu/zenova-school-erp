"""Feature Flag endpoint — single source of truth for enabled/disabled features."""
from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["features"])


@router.get("/config/features")
def get_features():
    return {
        "chapa": settings.feature_chapa,
    }
