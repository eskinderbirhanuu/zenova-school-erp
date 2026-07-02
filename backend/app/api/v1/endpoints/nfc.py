from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.nfc import (
    NFCAssignRequest, NFCResponse, NFCValidateRequest, NFCValidateResponse,
    NFCStatusUpdate, NFCHistoryResponse,
)
from app.services import nfc_service
from app.api.v1.deps import get_current_user, require_licensed_feature
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.nfc_card import NFCCard

router = APIRouter(tags=["nfc"])


@router.post("/nfc/assign", response_model=NFCResponse, status_code=status.HTTP_201_CREATED)
def assign_nfc(
    data: NFCAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_CREATE),
    _: None = Depends(require_licensed_feature("nfc")),
):
    # Tenant scoping: a body-provided school_id is honored only for SUPER_ADMIN;
    # every other caller is pinned to their own tenant.
    school_id = data.school_id if current_user.is_superuser else current_user.school_id
    try:
        nfc = nfc_service.assign_nfc(
            db, data.card_uid, data.reference_type, data.reference_id,
            school_id, current_user.id,
        )
        return NFCResponse.model_validate(nfc)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/nfc/validate", response_model=NFCValidateResponse)
def validate_nfc(
    data: NFCValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_licensed_feature("nfc")),
):
    result = nfc_service.validate_nfc(db, data.card_uid)
    # Tenant isolation: a card belonging to another school is treated as
    # invalid for non-superuser callers, so no cross-tenant enumeration.
    if not current_user.is_superuser and result.get("school_id") and result["school_id"] != current_user.school_id:
        result = {"valid": False, "status": "unknown", "message": "Card not recognized"}
    return NFCValidateResponse(**result)


@router.get("/nfc/card/{uid}", response_model=NFCResponse)
def get_nfc_card(
    uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    nfc = db.query(NFCCard).filter(NFCCard.card_uid == uid).first()
    if not nfc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NFC card not found")
    # Tenant isolation: non-superuser callers cannot read cards from other schools.
    if not current_user.is_superuser and nfc.school_id != current_user.school_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NFC card not found")
    return NFCResponse.model_validate(nfc)


@router.patch("/nfc/{nfc_id}/status", response_model=NFCResponse)
def update_nfc_status(
    nfc_id: str, data: NFCStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_CREATE),
):
    nfc = nfc_service.update_nfc_status(db, nfc_id, data.status, current_user.school_id, user_id=current_user.id)
    if not nfc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NFC card not found")
    return NFCResponse.model_validate(nfc)


@router.get("/nfc/history", response_model=list[NFCHistoryResponse])
def get_nfc_history(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.AUDIT_VIEW),
):
    nfcs = nfc_service.get_nfc_history(db, current_user.school_id)
    return [NFCHistoryResponse.model_validate(n) for n in nfcs]
