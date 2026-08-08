import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer

logger = logging.getLogger("zenova.cc.partners")

router = APIRouter()

_PARTNERS_FILE = Path(__file__).resolve().parents[3] / "partners.json"


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
