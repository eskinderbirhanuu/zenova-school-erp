from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.permissions import require_role
from app.models.user import User
from app.models.number_sequence import NumberSequence

router = APIRouter(tags=["sequences"])


@router.get("/admin/sequences")
def list_sequences(
    school_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = require_role("SUPER_ADMIN"),
):
    q = db.query(NumberSequence)
    if school_id:
        q = q.filter(NumberSequence.school_id == school_id)
    entries = q.order_by(NumberSequence.prefix, NumberSequence.year.desc()).all()
    return [
        {
            "id": e.id,
            "prefix": e.prefix,
            "school_id": e.school_id,
            "year": e.year,
            "last_number": e.last_number,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.post("/admin/sequences/{seq_id}/reset")
def reset_sequence(
    seq_id: str,
    last_number: int = Query(0, description="Reset to this value"),
    db: Session = Depends(get_db),
    current_user: User = require_role("SUPER_ADMIN"),
):
    seq = db.query(NumberSequence).filter(NumberSequence.id == seq_id).first()
    if not seq:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sequence not found")
    seq.last_number = last_number
    db.commit()
    return {"success": True, "prefix": seq.prefix, "last_number": seq.last_number}
