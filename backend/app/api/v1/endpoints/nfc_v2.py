from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.nfc_v2 import (
    StudentCardResponse, StaffCardResponse, ParentCardResponse, EmployeeCardResponse,
    NfcAssignRequest, BulkAssignItem, BulkAssignResult,
    NfcScanRequest, NfcScanResponse,
    CardPrintRequestCreate, CardPrintRequestResponse, NfcScanLogResponse,
)
from app.services import nfc_v2_service
from app.api.v1.deps import get_current_user, require_licensed_feature
from app.core.permissions import require_permission, Permission
from app.models.user import User

router = APIRouter(tags=["nfc"])


@router.post("/nfc/student/assign", response_model=StudentCardResponse, status_code=status.HTTP_201_CREATED)
def assign_student_card(
    data: NfcAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_CREATE),
    _: None = Depends(require_licensed_feature("nfc")),
):
    try:
        card = nfc_v2_service.assign_student_card(db, data.reference_id, data.card_uid, current_user.id, data.card_tier)
        return StudentCardResponse.model_validate(card)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/nfc/staff/assign", response_model=StaffCardResponse, status_code=status.HTTP_201_CREATED)
def assign_staff_card(
    data: NfcAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STAFF_CREATE),
    _: None = Depends(require_licensed_feature("nfc")),
):
    try:
        card = nfc_v2_service.assign_staff_card(db, data.reference_id, data.card_uid, current_user.id, data.card_tier)
        return StaffCardResponse.model_validate(card)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/nfc/parent/assign", response_model=ParentCardResponse, status_code=status.HTTP_201_CREATED)
def assign_parent_card(
    data: NfcAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.PARENT_CREATE),
    _: None = Depends(require_licensed_feature("nfc")),
):
    try:
        card = nfc_v2_service.assign_parent_card(db, data.reference_id, data.card_uid, current_user.id, data.card_tier)
        return ParentCardResponse.model_validate(card)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/nfc/employee/assign", response_model=EmployeeCardResponse, status_code=status.HTTP_201_CREATED)
def assign_employee_card(
    data: NfcAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_licensed_feature("nfc")),
):
    try:
        card = nfc_v2_service.assign_employee_card(db, data.reference_id, data.card_uid, current_user.id, data.card_tier)
        return EmployeeCardResponse.model_validate(card)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/nfc/bulk-assign", response_model=BulkAssignResult, status_code=status.HTTP_200_OK)
def bulk_assign_cards(
    items: list[BulkAssignItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_licensed_feature("nfc")),
):
    result = nfc_v2_service.bulk_assign_cards(
        db, [item.model_dump() for item in items], current_user.id
    )
    return BulkAssignResult(**result)


@router.get("/nfc/public/lookup")
def public_lookup_card(
    card_uid: str,
    db: Session = Depends(get_db),
):
    """Public endpoint — no authentication required.
    Returns ONLY whether the card belongs to ZENOVA, with contact info.
    NEVER returns any personal identifiable information."""
    return nfc_v2_service.public_lookup_card(db, card_uid)


@router.post("/nfc/scan", response_model=NfcScanResponse)
def scan_nfc_card(
    data: NfcScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = nfc_v2_service.scan_nfc(db, data.card_uid, data.scan_type, data.reader_location)
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["message"])
    return NfcScanResponse(**result)


@router.get("/nfc/student/by-card/{card_uid}")
def get_student_by_card_uid(
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = nfc_v2_service.get_student_by_card(db, card_uid, current_user.school_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found for this card")
    return {
        "student_id": student.student_id,
        "first_name": student.first_name,
        "middle_name": student.middle_name,
        "last_name": student.last_name,
        "photo_url": student.photo_url,
        "grade_id": student.grade_id,
        "section_id": student.section_id,
        "status": student.status,
    }


@router.get("/nfc/staff/by-card/{card_uid}")
def get_staff_by_card_uid(
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = nfc_v2_service.get_staff_by_card(db, card_uid, current_user.school_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found for this card")
    return {
        "staff_id": result["staff_profile"].staff_id,
        "full_name": result["user"].full_name,
        "department": result["staff_profile"].department,
        "photo_url": result["user"].photo_url,
        "email": result["user"].email,
    }


@router.get("/nfc/parent/by-card/{card_uid}")
def get_parent_by_card_uid(
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent = nfc_v2_service.get_parent_by_card(db, card_uid, current_user.school_id)
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found for this card")
    return {
        "parent_id": parent.parent_id,
        "full_name": parent.full_name,
        "phone_1": parent.phone_1,
        "photo_url": parent.photo_url,
    }


@router.get("/nfc/employee/by-card/{card_uid}")
def get_employee_by_card_uid(
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = nfc_v2_service.get_employee_by_card(db, card_uid, current_user.school_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found for this card")
    emp = result["employee"]
    return {
        "employee_id": emp.employee_id,
        "full_name": emp.full_name,
        "department_id": emp.department_id,
        "position": emp.position,
        "photo_url": emp.photo_url,
    }


@router.patch("/nfc/card/{card_type}/{card_id}/status")
def update_nfc_card_status(
    card_type: str,
    card_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CARD_PRINT_ASSIGN),
):
    ok = nfc_v2_service.update_card_status(db, card_type, card_id, status, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return {"detail": "Card status updated"}


@router.post("/nfc/print-request", response_model=CardPrintRequestResponse, status_code=status.HTTP_201_CREATED)
def create_print_request(
    data: CardPrintRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CARD_PRINT),
):
    req = nfc_v2_service.request_card_print(db, data.card_type, data.reference_id, current_user.id, data.notes)
    return CardPrintRequestResponse.model_validate(req)


@router.get("/nfc/print-requests", response_model=list[CardPrintRequestResponse])
def list_print_requests(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CARD_PRINT),
):
    reqs = nfc_v2_service.list_print_requests(db, status_filter)
    return [CardPrintRequestResponse.model_validate(r) for r in reqs]


@router.patch("/nfc/print-request/{request_id}/process", response_model=CardPrintRequestResponse)
def process_print_request(
    request_id: str,
    action: str = "approve",
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.CARD_PRINT),
):
    req = nfc_v2_service.process_print_request(db, request_id, current_user.id, action)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Print request not found")
    return CardPrintRequestResponse.model_validate(req)


@router.get("/nfc/print-card/{card_type}/{reference_id}")
def download_card_pdf(
    card_type: str,
    reference_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.card_pdf_service import generate_card_pdf
    pdf_bytes = generate_card_pdf(db, card_type, reference_id, current_user.school_id)
    if not pdf_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card or person not found")
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={card_type}_{reference_id}.pdf"},
    )


@router.get("/nfc/card-qr/{card_uid}")
def get_card_qr_code(
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.card_qr_service import generate_card_qr_png, resolve_card_type
    card_type = resolve_card_type(card_uid, db)
    if not card_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    png = generate_card_qr_png(card_uid)
    return StreamingResponse(
        iter([png]),
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=card_{card_uid}.png"},
    )


@router.get("/nfc/scan-logs", response_model=list[NfcScanLogResponse])
def list_nfc_scan_logs(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.AUDIT_VIEW),
):
    school_id = current_user.school_id if not current_user.is_superuser else None
    logs = nfc_v2_service.list_scan_logs(db, school_id)
    return [NfcScanLogResponse.model_validate(l) for l in logs]
