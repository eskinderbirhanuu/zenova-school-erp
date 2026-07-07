import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse, TransferRequest, PromoteRequest,
)
from app.schemas.student_document import StudentDocumentResponse, StudentDocumentCreate
from app.services import student_service, qr_service, nfc_service
from app.api.v1.deps import get_current_user, require_licensed_feature
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.student_document import StudentDocument
from app.models.report_card import PromotionRecord
from app.utils.excel import parse_excel, excel_response

router = APIRouter(tags=["students"])


@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_CREATE),
):
    """Register a new student (REGISTRAR only)"""
    from app.services import id_service
    # Tenant scoping: a body-provided school_id is honored only for SUPER_ADMIN;
    # every other caller is pinned to their own tenant to prevent cross-tenant creation.
    school_id = (data.school_id if current_user.is_superuser else None) or current_user.school_id
    # Non-superusers may not move records into a branch outside their school.
    branch_id = (data.branch_id if current_user.is_superuser else None) or current_user.branch_id
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
        branch_id=branch_id,
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
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    students = student_service.search_students(
        db, query=query, grade_id=grade_id, section_id=section_id,
        status=status, school_id=current_user.school_id,
        skip=skip, limit=limit, include_deleted=include_deleted,
    )
    return [StudentResponse.model_validate(s) for s in students]


@router.get("/students/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    student = student_service.get_student(db, student_id, school_id=current_user.school_id, include_deleted=include_deleted)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.patch("/students/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_EDIT),
):
    student = student_service.update_student(db, student_id, data.model_dump(exclude_none=True), school_id=current_user.school_id, user_id=current_user.id, include_deleted=True)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.delete("/students/{student_id}")
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_DELETE),
):
    deleted = student_service.delete_student(db, student_id, school_id=current_user.school_id, user_id=current_user.id, include_deleted=True)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return {"message": "Student deleted successfully"}


@router.post("/students/{student_id}/transfer", response_model=StudentResponse)
def transfer_student(
    student_id: str,
    data: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_EDIT),
):
    student = student_service.transfer_student(db, student_id, data.grade_id, data.section_id, data.reason, school_id=current_user.school_id, user_id=current_user.id, include_deleted=True)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.post("/students/{student_id}/promote", response_model=StudentResponse)
def promote_student(
    student_id: str,
    data: PromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_EDIT),
):
    student = student_service.promote_student(db, student_id, data.to_grade_id, data.academic_year_id, school_id=current_user.school_id, user_id=current_user.id, include_deleted=True)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.post("/students/{student_id}/generate-qr")
def generate_student_qr(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_EDIT),
):
    student = student_service.get_student(db, student_id, school_id=current_user.school_id, include_deleted=True)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    qr = qr_service.generate_qr(db, "student", student.id, student.school_id, student.branch_id, user_id=current_user.id)
    return {"uuid": qr.uuid, "reference_type": qr.reference_type, "reference_id": qr.reference_id}


@router.post("/students/{student_id}/assign-nfc")
def assign_student_nfc(
    student_id: str,
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_EDIT),
):
    student = student_service.get_student(db, student_id, school_id=current_user.school_id, include_deleted=True)
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
    current_user: User = require_permission(Permission.STUDENT_CREATE),
    _: None = Depends(require_licensed_feature("import")),
):
    from app.services import id_service
    # Tenant scoping: non-superusers import into their own school only; a body
    # school_id is forced to the caller's tenant to prevent cross-tenant creation.
    forced_school_id = current_user.school_id
    for d in data:
        if current_user.is_superuser and d.get("school_id"):
            forced_school_id = d["school_id"]
        if not d.get("student_id"):
            d["student_id"] = id_service.generate_id(db, "student", forced_school_id)
        d["school_id"] = forced_school_id
        d.setdefault("registered_by", current_user.id)
    students = student_service.bulk_create_students(db, data)
    return {"message": f"{len(students)} students imported", "count": len(students)}


@router.post("/students/import-excel", status_code=status.HTTP_201_CREATED)
def import_students_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.STUDENT_CREATE),
    _: None = Depends(require_licensed_feature("import")),
):
    from app.services import id_service
    data = parse_excel(file)
    forced_school_id = current_user.school_id
    for d in data:
        if current_user.is_superuser and d.get("school_id"):
            forced_school_id = d["school_id"]
        if not d.get("student_id"):
            d["student_id"] = id_service.generate_id(db, "student", forced_school_id)
        d["school_id"] = forced_school_id
        d.setdefault("registered_by", current_user.id)
    students = student_service.bulk_create_students(db, data)
    return {"message": f"{len(students)} students imported", "count": len(students)}


@router.get("/students/export-excel")
def export_students_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    students = student_service.search_students(db, school_id=current_user.school_id, limit=5000, include_deleted=include_deleted)
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


@router.get("/students/{student_id}/transcript")
def student_transcript(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.class_ import ClassGrade
    from app.models.subject import Subject
    from app.models.exam import Exam, ExamResult
    from app.models.academic_year import AcademicYear, Semester
    from app.utils.grading import compute_grade as _compute_grade

    student = db.query(Student).filter(
        Student.id == student_id,
        Student.school_id == current_user.school_id,
    ).execution_options(include_deleted=True).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_ = db.query(ClassGrade).filter(ClassGrade.id == student.grade_id).first()
    promotion_history = db.query(PromotionRecord).filter(
        PromotionRecord.student_id == student_id,
    ).order_by(PromotionRecord.created_at.asc()).all()

    # Batch-load class grades to avoid N+1 queries
    class_ids = {pr.to_class_id for pr in promotion_history if pr.to_class_id}
    classes = db.query(ClassGrade).filter(ClassGrade.id.in_(class_ids)).all() if class_ids else []
    class_map = {c.id: c.name for c in classes}

    grade_history = []
    if promotion_history:
        for pr in promotion_history:
            name = class_map.get(pr.to_class_id)
            if name:
                grade_history.append(name)

    all_semesters = db.query(Semester).join(AcademicYear).filter(
        AcademicYear.school_id == current_user.school_id,
    ).order_by(AcademicYear.start_date, Semester.start_date).all()

    semesters_data = []
    overall_total_pct = 0
    overall_count = 0

    # Batch-load all exams for all semesters to avoid N+1 queries
    semester_ids = [sem.id for sem in all_semesters]
    all_exams = db.query(Exam).filter(
        Exam.semester_id.in_(semester_ids),
        Exam.class_id == student.grade_id,
        Exam.school_id == current_user.school_id,
    ).all() if semester_ids else []

    # Group exams by semester_id
    exams_by_semester = {}
    for e in all_exams:
        exams_by_semester.setdefault(e.semester_id, []).append(e)

    for sem in all_semesters:
        exams = exams_by_semester.get(sem.id, [])
        exam_ids = [e.id for e in exams]
        results = db.query(ExamResult).filter(
            ExamResult.student_id == student_id,
            ExamResult.exam_id.in_(exam_ids),
        ).all() if exam_ids else []

        if not results:
            continue

        result_map = {}
        for r in results:
            exam = next((e for e in exams if e.id == r.exam_id), None)
            if exam and exam.subject_id:
                if exam.subject_id not in result_map:
                    result_map[exam.subject_id] = []
                result_map[exam.subject_id].append({
                    "exam_name": exam.name,
                    "score": float(r.score) if r.score else 0,
                    "max_score": float(exam.max_score) if exam.max_score else 100,
                    "grade": r.grade,
                })

        subjects = db.query(Subject).filter(Subject.id.in_(list(result_map.keys()))).all() if result_map else []
        subject_map = {s.id: s.name for s in subjects}

        subject_grades = []
        sem_total = 0
        sem_count = 0
        for subj_id, scores in result_map.items():
            avg = sum(s["score"] for s in scores) / len(scores)
            max_avg = sum(s["max_score"] for s in scores) / len(scores)
            pct = round((avg / max_avg) * 100, 1) if max_avg > 0 else 0
            letter = _compute_grade(pct)
            subject_grades.append({
                "subject": subject_map.get(subj_id, "Unknown"),
                "average": round(avg, 1),
                "percentage": pct,
                "grade": letter,
            })
            sem_total += pct
            sem_count += 1

        sem_overall = round(sem_total / sem_count, 1) if sem_count > 0 else 0
        overall_total_pct += sem_overall
        overall_count += 1

        semesters_data.append({
            "semester_name": sem.name,
            "overall_percentage": sem_overall,
            "overall_grade": _compute_grade(sem_overall),
            "subjects": subject_grades,
        })

    return {
        "student_name": f"{student.first_name} {student.middle_name or ''} {student.last_name}".strip(),
        "student_id": student.student_id,
        "class": class_.name if class_ else "",
        "grade_history": grade_history,
        "semesters": semesters_data,
        "cumulative_average": round(overall_total_pct / overall_count, 1) if overall_count > 0 else 0,
        "cumulative_grade": _compute_grade(round(overall_total_pct / overall_count, 1)) if overall_count > 0 else "N/A",
    }


@router.get("/students/{student_id}/documents", response_model=list[StudentDocumentResponse])
def list_student_documents(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id, Student.school_id == current_user.school_id).execution_options(include_deleted=True).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    docs = db.query(StudentDocument).filter(
        StudentDocument.student_id == student_id
    ).order_by(StudentDocument.created_at.desc()).all()
    return [
        StudentDocumentResponse(
            id=str(doc.id), student_id=str(doc.student_id),
            filename=doc.filename, file_url=doc.file_url,
            file_type=doc.file_type,
            uploaded_by=str(doc.uploaded_by) if doc.uploaded_by else None,
            created_at=doc.created_at,
        )
        for doc in docs
    ]


@router.post("/students/{student_id}/documents", response_model=StudentDocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_student_document(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id, Student.school_id == current_user.school_id).execution_options(include_deleted=True).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    import os

    ext = file.filename.split(".")[-1] if "." in file.filename else ""
    safe_name = f"{uuid.uuid4()}.{ext}" if ext else f"{uuid.uuid4()}"
    upload_dir = f"uploads/students/{student_id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{safe_name}"

    content = file.file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc = StudentDocument(
        id=uuid.uuid4(),
        student_id=student_id,
        filename=file.filename,
        file_url=file_path,
        file_type=file.content_type,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return StudentDocumentResponse(
        id=str(doc.id), student_id=str(doc.student_id),
        filename=doc.filename, file_url=doc.file_url,
        file_type=doc.file_type,
        uploaded_by=str(doc.uploaded_by) if doc.uploaded_by else None,
        created_at=doc.created_at,
    )


@router.delete("/students/{student_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_document(
    student_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id, Student.school_id == current_user.school_id).execution_options(include_deleted=True).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    import os
    doc = db.query(StudentDocument).filter(
        StudentDocument.id == doc_id,
        StudentDocument.student_id == student_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if os.path.exists(doc.file_url):
        os.remove(doc.file_url)

    doc.deleted_at = datetime.now(timezone.utc)
    db.commit()
