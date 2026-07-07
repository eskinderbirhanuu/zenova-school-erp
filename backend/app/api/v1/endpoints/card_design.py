from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.card_design import CardDesignCreate, CardDesignResponse
from app.services import card_design_service
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User

router = APIRouter(tags=["card-design"])


@router.get("/card-design/{school_id}", response_model=CardDesignResponse)
def get_card_design(
    school_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser and str(current_user.school_id) != str(school_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access card designs for your own school")
    design = card_design_service.get_design(db, school_id)
    if not design:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No card design found for this school")
    return design


@router.put("/card-design/{school_id}", response_model=CardDesignResponse)
def save_card_design(
    school_id: str,
    data: CardDesignCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
):
    if not current_user.is_superuser and str(current_user.school_id) != str(school_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only modify card designs for your own school")
    return card_design_service.save_design(db, school_id, data.logo_url, data.design_json)
