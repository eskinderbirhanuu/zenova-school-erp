from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse, TransferRequest, PromoteRequest,
)
from app.services import student_service, qr_service, nfc_service
from app.api.v1.deps import get_current_user, require_licensed_feature
from app.core.permissions import PermissionChecker, RolePermission
from app.models.user import User
from app.utils.excel import parse_excel, excel_response

router = APIRouter(tags=["students"])


@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_CREATE)),
):
    """Register a new student (REGISTRAR only)"""
    from app.services import id_service
    school_id = data.school_id or current_user.school_id
    student_id = id_service.generate_id(db, "student", school_id)
    student = student_service.create_student(
        db=db,
        student_id=student_id,
        first_name=data.first_name,
        middle_name=data.middle_name,
        last_name=data.last_name,
        gender=data.gender,
        date_of_birth=data.date_of_birth,
        admission_date=data.admission_date,
        grade_id=data.grade_id,
        section_id=data.section_id,
        stream=data.stream,
        medical_notes=data.medical_notes,
        academic_year_id=data.academic_year_id,
        address=data.address,
        nationality=data.nationality,
        blood_group=data.blood_group,
        photo_url=data.photo_url,
        emergency_contact=data.emergency_contact,
        school_id=school_id,
        branch_id=data.branch_id or current_user.branch_id,
        registered_by=current_user.id,
    )
    return StudentResponse.model_validate(student)


@router.get("/students", response_model=list[StudentResponse])
def list_students(
    query: str | None = Query(None),
    grade_id: str | None = None,
    section_id: str | None = None,
    status: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List/search students"""
    students = student_service.search_students(
        db, query=query, grade_id=grade_id, section_id=section_id,
        status=status, school_id=current_user.school_id,
        skip=skip, limit=limit,
    )
    return [StudentResponse.model_validate(s) for s in students]


@router.get("/students/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.patch("/students/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_EDIT)),
):
    student = student_service.update_student(db, student_id, data.model_dump(exclude_none=True))
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.delete("/students/{student_id}")
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_DELETE)),
):
    deleted = student_service.delete_student(db, student_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return {"message": "Student deleted successfully"}


@router.post("/students/{student_id}/transfer", response_model=StudentResponse)
def transfer_student(
    student_id: str,
    data: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_EDIT)),
):
    student = student_service.transfer_student(db, student_id, data.grade_id, data.section_id, data.reason)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.post("/students/{student_id}/promote", response_model=StudentResponse)
def promote_student(
    student_id: str,
    data: PromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_EDIT)),
):
    student = student_service.promote_student(db, student_id, data.to_grade_id, data.academic_year_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.post("/students/{student_id}/generate-qr")
def generate_student_qr(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_EDIT)),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    qr = qr_service.generate_qr(db, "student", student.id, student.school_id, student.branch_id)
    return {"uuid": qr.uuid, "reference_type": qr.reference_type, "reference_id": qr.reference_id}


@router.post("/students/{student_id}/assign-nfc")
def assign_student_nfc(
    student_id: str,
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_EDIT)),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    try:
        nfc = nfc_service.assign_nfc(db, card_uid, "student", student.id, student.school_id, current_user.id)
        return {"card_uid": nfc.card_uid, "status": nfc.status, "reference_id": nfc.reference_id}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/students/bulk-import", status_code=status.HTTP_201_CREATED)
def bulk_import_students(
    data: list[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_CREATE)),
    _: None = Depends(require_licensed_feature("import")),
):
    from app.services import id_service
    for d in data:
        if not d.get("student_id"):
            d["student_id"] = id_service.generate_id(db, "student", d.get("school_id") or current_user.school_id)
        d.setdefault("school_id", current_user.school_id)
        d.setdefault("registered_by", current_user.id)
    students = student_service.bulk_create_students(db, data)
    return {"message": f"{len(students)} students imported", "count": len(students)}


@router.post("/students/import-excel", status_code=status.HTTP_201_CREATED)
def import_students_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker(RolePermission.STUDENT_CREATE)),
    _: None = Depends(require_licensed_feature("import")),
):
    from app.services import id_service
    data = parse_excel(file)
    for d in data:
        if not d.get("student_id"):
            d["student_id"] = id_service.generate_id(db, "student", d.get("school_id") or current_user.school_id)
        d.setdefault("school_id", current_user.school_id)
        d.setdefault("registered_by", current_user.id)
    students = student_service.bulk_create_students(db, data)
    return {"message": f"{len(students)} students imported", "count": len(students)}


@router.get("/students/export-excel")
def export_students_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    students = student_service.search_students(db, school_id=current_user.school_id, limit=5000)
    headers = ["Student ID", "First Name", "Middle Name", "Last Name", "Gender", "Date of Birth",
               "Grade ID", "Section ID", "Status", "Address", "Nationality", "Blood Group",
               "Emergency Contact", "Admission Date", "Stream", "Medical Notes"]
    rows = []
    for s in students:
        rows.append([
            s.student_id, s.first_name, s.middle_name or "", s.last_name, s.gender,
            str(s.date_of_birth) if s.date_of_birth else "", s.grade_id or "", s.section_id or "",
            s.status, s.address or "", s.nationality or "", s.blood_group or "",
            s.emergency_contact or "", str(s.admission_date) if s.admission_date else "",
            s.stream or "", s.medical_notes or "",
        ])
    return excel_response(headers, rows, "students.xlsx")
