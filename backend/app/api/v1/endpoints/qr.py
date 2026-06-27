from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.qr import QRGenerateRequest, QRResponse, QRValidateResponse, QRHistoryResponse
from app.services import qr_service
from app.api.v1.deps import get_current_user, require_licensed_feature
from app.core.permissions import PermissionChecker, RolePermission
from app.models.user import User

router = APIRouter(tags=["qr"])


@router.post("/qr/generate", response_model=QRResponse, status_code=status.HTTP_201_CREATED)
def generate_qr(
    data: QRGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_CREATE)),
    _: None = Depends(require_licensed_feature("qr")),
):
    qr = qr_service.generate_qr(
        db, data.reference_type, data.reference_id,
        data.school_id or current_user.school_id,
        data.branch_id or current_user.branch_id,
    )
    return QRResponse.model_validate(qr)


@router.get("/qr/{uuid}", response_model=QRValidateResponse)
def validate_qr(uuid: str, db: Session = Depends(get_db)):
    result = qr_service.validate_qr(db, uuid)
    return QRValidateResponse(**result)


@router.get("/qr/reference/{reference_type}/{reference_id}", response_model=QRResponse)
def get_qr_by_reference(
    reference_type: str,
    reference_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    qr = qr_service.get_qr_by_reference(db, reference_type, reference_id)
    if not qr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR code not found")
    return QRResponse.model_validate(qr)


@router.get("/qr/history/all", response_model=list[QRHistoryResponse])
def get_qr_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.AUDIT_VIEW)),
):
    qrs = qr_service.get_qr_history(db, current_user.school_id)
    return [QRHistoryResponse.model_validate(q) for q in qrs]
