import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer

logger = logging.getLogger("zenova.cc.partners")

router = APIRouter()

_PARTNERS_FILE = Path(__file__).resolve().parents[3] / "partners.json"
_REMOTE_CONFIG_FILE = Path(__file__).resolve().parents[3] / "remote_config.json"

_DEFAULT_REMOTE_CONFIG: dict[str, Any] = {
    "minimum_version": "1.0.0",
    "recommended_version": "1.0.0",
    "maintenance_mode": False,
    "message": "",
    "features": {},
}


def _load_partners() -> list[dict[str, Any]]:
    try:
        with _PARTNERS_FILE.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict) and item.get("name")]
    except FileNotFoundError:
        logger.warning("partners.json not found at %s", _PARTNERS_FILE)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Failed to read partners.json: %s", exc)
    return []


def _load_remote_config() -> dict[str, Any]:
    try:
        with _REMOTE_CONFIG_FILE.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict):
            return data
    except FileNotFoundError:
        logger.warning("remote_config.json not found at %s", _REMOTE_CONFIG_FILE)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Failed to read remote_config.json: %s", exc)
    return dict(_DEFAULT_REMOTE_CONFIG)


def _school_payload(c: Customer) -> dict[str, Any]:
    try:
        features = json.loads(c.features or "{}")
    except (json.JSONDecodeError, TypeError):
        features = {}
    return {
        "name": c.name,
        "domain": c.domain,
        "code": c.domain.split(".")[0],
        "api_url": f"https://{c.domain}",
        "branding": {
            "logo_url": c.logo_url or "",
            "primary_color": c.primary_color or "#6366F1",
            "secondary_color": c.secondary_color or "#8B5CF6",
            "accent_color": c.accent_color or "#EC4899",
            "tagline": c.tagline or "",
        },
        "features": features if isinstance(features, dict) else {},
    }


@router.get("/partners")
def list_partners() -> dict[str, Any]:
    """Public partner advertisement feed for the ZENOVA mobile app."""
    return {"partners": _load_partners()}


@router.get("/schools")
def list_schools(search: str = "", db: Session = Depends(get_db)) -> dict[str, Any]:
    """Public school discovery feed for the ZENOVA mobile app.

    Returns only the school name and its server domain for active customers —
    no emails, phones, addresses, or other sensitive data.
    """
    query = db.query(Customer).filter(Customer.is_active.is_(True))
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(Customer.name.ilike(term) | Customer.domain.ilike(term))
    items = query.order_by(Customer.name.asc()).limit(100).all()
    return {
        "schools": [
            {"name": c.name, "domain": c.domain, "code": c.domain.split(".")[0]}
            for c in items
        ]
    }


class SchoolResolveRequest(BaseModel):
    code: str


@router.post("/schools/resolve")
def resolve_school(data: SchoolResolveRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Public APU school resolution.

    Given a school code (or domain), return the school's public configuration
    and branding so the mobile app can render the school-specific login.
    Only active customers resolve.
    """
    code = (data.code or "").strip().lower()
    if not code:
        return {"found": False, "error": "code is required"}
    query = db.query(Customer).filter(Customer.is_active.is_(True))
    candidate = (
        query.filter(Customer.domain.ilike(f"{code}.%"))
        .order_by(Customer.name.asc())
        .first()
    )
    if candidate is None:
        candidate = (
            query.filter(Customer.domain.ilike(code)).first()
        )
    if candidate is None:
        return {"found": False, "error": "school not found"}
    return {"found": True, "school": _school_payload(candidate)}


@router.get("/config")
def remote_config() -> dict[str, Any]:
    """Public remote configuration for the APU mobile app.

    Powers app version gating, maintenance mode, and global feature flags
    without requiring a mobile app release.
    """
    cfg = _load_remote_config()
    return {
        "minimum_version": cfg.get("minimum_version", _DEFAULT_REMOTE_CONFIG["minimum_version"]),
        "recommended_version": cfg.get("recommended_version", _DEFAULT_REMOTE_CONFIG["recommended_version"]),
        "maintenance_mode": bool(cfg.get("maintenance_mode", False)),
        "message": cfg.get("message", ""),
        "features": cfg.get("features", {}) if isinstance(cfg.get("features"), dict) else {},
    }
