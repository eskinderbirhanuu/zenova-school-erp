from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter()

@router.get("/live")
def live():
    return {"status": "ok"}

@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "fail"
    return {"status": "ok" if db_status == "ok" else "fail", "database": db_status}
