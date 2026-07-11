import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.school_settings import SchoolSettings
from app.core.permissions import require_permission, Permission
from app.schemas.settings import SchoolSettingsUpdate

router = APIRouter(tags=["settings"])


@router.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User has no school")
    settings = db.query(SchoolSettings).filter(
        SchoolSettings.school_id == current_user.school_id
    ).first()
    if not settings or not settings.settings_json:
        return {"settings": {}}
    return {"settings": json.loads(settings.settings_json)}


@router.put("/settings")
def update_settings(
    data: SchoolSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User has no school")
    settings = db.query(SchoolSettings).filter(
        SchoolSettings.school_id == current_user.school_id
    ).first()
    if not settings:
        settings = SchoolSettings(school_id=current_user.school_id)
        db.add(settings)
    settings.settings_json = json.dumps(data.settings.model_dump(exclude_none=True))
    db.commit()
    db.refresh(settings)
    return {"message": "Settings saved", "settings": json.loads(settings.settings_json)}
