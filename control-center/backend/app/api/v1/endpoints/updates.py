import hashlib, os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.update import Update

router = APIRouter()

@router.get("")
def list_updates(db: Session = Depends(get_db)):
    return db.query(Update).order_by(Update.created_at.desc()).all()

@router.post("")
async def upload_update(
    version: str,
    changelog: str = "",
    is_mandatory: bool = False,
    min_version: str = "0.0.0",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    existing = db.query(Update).filter(Update.version == version).first()
    if existing:
        raise HTTPException(status_code=400, detail="Version already exists")

    os.makedirs(settings.update_storage_path, exist_ok=True)
    file_path = os.path.join(settings.update_storage_path, f"zenova-{version}.tar.gz")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    checksum = hashlib.sha256(content).hexdigest()
    update = Update(
        version=version,
        changelog=changelog,
        file_path=file_path,
        file_size=len(content),
        checksum=checksum,
        is_mandatory=is_mandatory,
        min_version=min_version,
    )
    db.add(update)
    db.commit()
    return {
        "version": version,
        "file_size": len(content),
        "checksum": checksum,
    }

@router.get("/latest")
def latest_update(current_version: str = "0.0.0", db: Session = Depends(get_db)):
    update = db.query(Update).filter(
        Update.min_version <= current_version
    ).order_by(Update.created_at.desc()).first()
    if not update:
        return {"update_available": False}
    return {
        "update_available": True,
        "version": update.version,
        "changelog": update.changelog,
        "file_size": update.file_size,
        "checksum": update.checksum,
        "is_mandatory": update.is_mandatory,
    }

@router.get("/{update_id}/download")
def download_update(update_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse
    update = db.query(Update).filter(Update.id == update_id).first()
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")
    return FileResponse(update.file_path, filename=f"zenova-{update.version}.tar.gz")
