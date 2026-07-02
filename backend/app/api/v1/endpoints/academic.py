from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.models.assignment import Assignment
from app.models.exam import Exam
from app.models.student import Student
from app.schemas.academic import (
    AcademicYearCreate, AcademicYearResponse,
    SemesterCreate, SemesterResponse,
    ClassGradeCreate, ClassGradeUpdate, ClassGradeResponse,
    SectionCreate, SectionUpdate, SectionResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse,
    ClassroomCreate, ClassroomUpdate, ClassroomResponse,
    TimetableEntryCreate, TimetableEntryUpdate, TimetableEntryResponse,
    ExamTypeCreate, ExamTypeResponse,
    ExamCreate, ExamUpdate, ExamResponse,
    ExamResultCreate, ExamResultUpdate, ExamResultResponse,
    PromotionCreate, PromotionResponse,
    BulkExamResultCreate, BulkPromotionCreate,
)
from app.models.academic_year import AcademicYear
from app.services import academic_service
from app.utils.excel import parse_excel, excel_response

router = APIRouter()

DIRECTOR_CREATE = [require_role("DIRECTOR", "REGISTRAR")]
DIRECTOR_ONLY = [require_role("DIRECTOR")]


@router.get("/academic-years", response_model=list[AcademicYearResponse])
def list_academic_years(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_academic_years(db, current_user.school_id, include_deleted=include_deleted)


@router.post("/academic-years", response_model=AcademicYearResponse, dependencies=DIRECTOR_CREATE)
def create_academic_year(data: AcademicYearCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_academic_year(db, current_user.school_id, data, current_user.id)


@router.patch("/academic-years/{year_id}/set-current", response_model=AcademicYearResponse, dependencies=DIRECTOR_ONLY)
def set_current_year(year_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.set_current_academic_year(db, year_id, current_user.school_id, current_user.id)


@router.post("/semesters", response_model=SemesterResponse, dependencies=DIRECTOR_CREATE)
def create_semester(data: SemesterCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_semester(db, current_user.school_id, data, current_user.id)


@router.get("/semesters", response_model=list[SemesterResponse])
def list_semesters(academic_year_id: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_semesters(db, current_user.school_id, academic_year_id, include_deleted=include_deleted)


@router.post("/classes", response_model=ClassGradeResponse, dependencies=DIRECTOR_CREATE)
def create_class(data: ClassGradeCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_class_grade(db, current_user.school_id, data, current_user.id)


@router.get("/classes", response_model=list[ClassGradeResponse])
def list_classes(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_classes(db, current_user.school_id, include_deleted=include_deleted)


@router.patch("/classes/{class_id}", response_model=ClassGradeResponse, dependencies=DIRECTOR_CREATE)
def update_class(class_id: str, data: ClassGradeUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.update_class_grade(db, class_id, data, current_user.id, current_user.school_id)


@router.delete("/classes/{class_id}", dependencies=DIRECTOR_CREATE)
def delete_class(class_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    academic_service.delete_class_grade(db, class_id, current_user.id, current_user.school_id)
    return {"message": "Class deleted"}


@router.post("/sections", response_model=SectionResponse, dependencies=DIRECTOR_CREATE)
def create_section(data: SectionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_section(db, current_user.school_id, data, current_user.id)


@router.get("/sections", response_model=list[SectionResponse])
def list_sections(class_id: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_sections(db, current_user.school_id, class_id, include_deleted=include_deleted)


@router.patch("/sections/{section_id}", response_model=SectionResponse, dependencies=DIRECTOR_CREATE)
def update_section(section_id: str, data: SectionUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.update_section(db, section_id, data, current_user.id, current_user.school_id)


@router.delete("/sections/{section_id}", dependencies=DIRECTOR_CREATE)
def delete_section(section_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    academic_service.delete_section(db, section_id, current_user.id, current_user.school_id)
    return {"message": "Section deleted"}


@router.post("/subjects", response_model=SubjectResponse, dependencies=DIRECTOR_CREATE)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_subject(db, current_user.school_id, data, current_user.id)


@router.get("/subjects", response_model=list[SubjectResponse])
def list_subjects(class_id: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_subjects(db, current_user.school_id, class_id, include_deleted=include_deleted)


@router.patch("/subjects/{subject_id}", response_model=SubjectResponse, dependencies=DIRECTOR_CREATE)
def update_subject(subject_id: str, data: SubjectUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.update_subject(db, subject_id, data, current_user.id, current_user.school_id)


@router.delete("/subjects/{subject_id}", dependencies=DIRECTOR_CREATE)
def delete_subject(subject_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    academic_service.delete_subject(db, subject_id, current_user.id, current_user.school_id)
    return {"message": "Subject deleted"}


@router.post("/classrooms", response_model=ClassroomResponse, dependencies=DIRECTOR_CREATE)
def create_classroom(data: ClassroomCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_classroom(db, current_user.school_id, data, current_user.id)


@router.get("/classrooms", response_model=list[ClassroomResponse])
def list_classrooms(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_classrooms(db, current_user.school_id, include_deleted=include_deleted)


@router.patch("/classrooms/{classroom_id}", response_model=ClassroomResponse, dependencies=DIRECTOR_CREATE)
def update_classroom(classroom_id: str, data: ClassroomUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.update_classroom(db, classroom_id, data, current_user.id, current_user.school_id)


@router.delete("/classrooms/{classroom_id}", dependencies=DIRECTOR_CREATE)
def delete_classroom(classroom_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    academic_service.delete_classroom(db, classroom_id, current_user.id, current_user.school_id)
    return {"message": "Classroom deleted"}


@router.post("/timetable", response_model=TimetableEntryResponse, dependencies=DIRECTOR_CREATE)
def create_timetable_entry(data: TimetableEntryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_timetable_entry(db, current_user.school_id, data, current_user.id)


@router.patch("/timetable/{entry_id}", response_model=TimetableEntryResponse, dependencies=DIRECTOR_CREATE)
def update_timetable_entry(entry_id: str, data: TimetableEntryUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.update_timetable_entry(db, entry_id, data, current_user.id, current_user.school_id)


@router.delete("/timetable/{entry_id}", dependencies=DIRECTOR_CREATE)
def delete_timetable_entry(entry_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    academic_service.delete_timetable_entry(db, entry_id, current_user.id, current_user.school_id)
    return {"message": "Timetable entry deleted"}


@router.get("/timetable", response_model=list[TimetableEntryResponse])
def get_timetable(section_id: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_timetable(db, current_user.school_id, section_id, include_deleted=include_deleted)


@router.get("/timetable/by-teacher", response_model=list[TimetableEntryResponse])
def get_teacher_timetable(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    teacher_id = None
    if current_user.teacher_profile_id:
        teacher_id = current_user.teacher_profile_id
    elif current_user.role in ("ADMIN", "DIRECTOR"):
        teacher_id = current_user.id
    if not teacher_id:
        raise HTTPException(status_code=400, detail="User is not a teacher")
    return db.query(TimetableEntry).filter(
        TimetableEntry.school_id == current_user.school_id,
        TimetableEntry.teacher_id == teacher_id,
    ).order_by(TimetableEntry.day_of_week, TimetableEntry.start_time).all()


@router.post("/timetable/check-conflicts")
def check_conflicts(
    data: TimetableEntryCreate, db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conflicts = academic_service.check_timetable_conflicts(
        db, current_user.school_id, data.day_of_week,
        data.start_time, data.end_time,
        teacher_id=data.teacher_id, section_id=data.section_id,
        classroom_id=data.classroom_id,
    )
    return {"conflicts": conflicts}


@router.post("/exam-types", response_model=ExamTypeResponse, dependencies=DIRECTOR_CREATE)
def create_exam_type(data: ExamTypeCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_exam_type(db, current_user.school_id, data, current_user.id)


@router.get("/exam-types", response_model=list[ExamTypeResponse])
def list_exam_types(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_exam_types(db, current_user.school_id, include_deleted=include_deleted)


@router.post("/exams", response_model=ExamResponse, dependencies=DIRECTOR_ONLY)
def create_exam(data: ExamCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_exam(db, current_user.school_id, data, current_user.id)


@router.patch("/exams/{exam_id}", response_model=ExamResponse, dependencies=DIRECTOR_CREATE)
def update_exam(exam_id: str, data: ExamUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.update_exam(db, exam_id, data, current_user.id, current_user.school_id)


@router.get("/exams", response_model=list[ExamResponse])
def list_exams(
    class_id: str = Query(None), subject_id: str = Query(None),
    semester_id: str = Query(None), db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_exams(db, current_user.school_id, class_id, subject_id, semester_id, include_deleted=include_deleted)


@router.post("/exam-results", response_model=ExamResultResponse, dependencies=DIRECTOR_CREATE)
def create_exam_result(data: ExamResultCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.create_exam_result(db, current_user.school_id, data, current_user.id)


@router.patch("/exam-results/{result_id}", response_model=ExamResultResponse, dependencies=DIRECTOR_CREATE)
def update_exam_result(result_id: str, data: ExamResultUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.update_exam_result(db, result_id, data, current_user.id, current_user.school_id)


@router.get("/exam-results", response_model=list[ExamResultResponse])
def list_exam_results(exam_id: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'))
    return academic_service.get_exam_results(db, current_user.school_id, exam_id, include_deleted=include_deleted)


@router.get("/exam-results/marksheet")
def marksheet_view(
    subject_id: str = Query(...), section_id: str = Query(...),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    from app.models.section import Section
    from app.models.exam import ExamResult

    section = db.query(Section).filter(Section.id == section_id, Section.school_id == current_user.school_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    students = db.query(Student).filter(
        Student.section_id == section_id, Student.school_id == current_user.school_id
    ).order_by(Student.first_name).all()

    from app.models.exam import Exam
    exams = db.query(Exam).filter(
        Exam.subject_id == subject_id, Exam.school_id == current_user.school_id
    ).order_by(Exam.exam_date).all()
    exam_ids = [e.id for e in exams]

    results = db.query(ExamResult).filter(
        ExamResult.exam_id.in_(exam_ids),
        ExamResult.school_id == current_user.school_id,
    ).all() if exam_ids else []

    result_map: dict[str, dict[str, float]] = {}
    for r in results:
        if r.student_id not in result_map:
            result_map[r.student_id] = {}
        result_map[r.student_id][r.exam_id] = float(r.score) if r.score else 0

    students_data = []
    for s in students:
        student_results = {}
        total = 0
        count = 0
        for e in exams:
            score = result_map.get(s.id, {}).get(e.id)
            student_results[e.id] = score
            if score is not None:
                total += score
                count += 1
        students_data.append({
            "id": s.id,
            "student_id": s.student_id,
            "full_name": f"{s.first_name} {s.middle_name or ''} {s.last_name}".strip(),
            "results": student_results,
            "average": round(total / count, 1) if count > 0 else None,
        })

    return {
        "subject_id": subject_id,
        "section_id": section_id,
        "section_name": section.name,
        "exams": [{"id": e.id, "name": e.name, "max_score": float(e.max_score) if e.max_score else 100, "exam_date": str(e.exam_date) if e.exam_date else None} for e in exams],
        "students": students_data,
    }


@router.post("/promotions", response_model=PromotionResponse, dependencies=DIRECTOR_CREATE)
def promote_student(data: PromotionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    year = db.query(AcademicYear).filter(
        AcademicYear.school_id == current_user.school_id,
        AcademicYear.is_current == True
    ).first()
    academic_year_id = year.id if year else None
    return academic_service.promote_student(db, current_user.school_id, data.student_id, data.to_class_id, academic_year_id, current_user.id)


@router.get("/promotions", response_model=list[PromotionResponse])
def get_promotions(student_id: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return academic_service.get_promotion_history(db, current_user.school_id, student_id)


@router.post("/exam-results/bulk", dependencies=DIRECTOR_CREATE)
def bulk_create_exam_results(data: BulkExamResultCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    results = academic_service.bulk_create_exam_results(db, current_user.school_id, data.results, current_user.id)
    return {"message": f"{len(results)} results recorded", "count": len(results)}


@router.post("/promotions/bulk", dependencies=DIRECTOR_CREATE)
def bulk_promote_students(data: BulkPromotionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    year = db.query(AcademicYear).filter(
        AcademicYear.school_id == current_user.school_id,
        AcademicYear.is_current == True
    ).first()
    academic_year_id = year.id if year else None
    promoted = academic_service.bulk_promote_students(db, data.student_ids, data.to_class_id, academic_year_id, current_user.id, current_user.school_id)
    return {"message": f"{len(promoted)} students promoted", "count": len(promoted)}


@router.post("/exam-results/import-excel", dependencies=DIRECTOR_CREATE)
def import_exam_results_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    data = parse_excel(file)
    results = []
    for row in data:
        exam_id = row.get("exam_id")
        student_id = row.get("student_id")
        score = row.get("score")
        if not exam_id or not student_id:
            continue
        try:
            score_val = float(score) if score else 0
        except ValueError:
            score_val = 0
        from app.schemas.academic import ExamResultCreate as ERC
        results.append(ERC(exam_id=exam_id, student_id=student_id, score=score_val, remarks=row.get("remarks")))
    created = academic_service.bulk_create_exam_results(db, current_user.school_id, results, current_user.id)
    return {"message": f"{len(created)} results imported", "count": len(created)}


@router.get("/exam-results/export-excel")
def export_exam_results_excel(
    exam_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = academic_service.get_exam_results(db, current_user.school_id, exam_id)
    exam = db.query(Exam).filter(Exam.id == exam_id, Exam.school_id == current_user.school_id).first()
    headers = ["Student ID", "Student Name", "Score", "Remarks"]
    rows = []
    for r in results:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        name = f"{student.first_name} {student.last_name}" if student else r.student_id
        rows.append([r.student_id, name, r.score, r.remarks or ""])
    filename = f"exam_results_{exam.name if exam else exam_id}.xlsx"
    return excel_response(headers, rows, filename)


@router.get("/assignments")
def list_assignments(section_id: str = Query(None), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
                     db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(Assignment).filter(Assignment.school_id == current_user.school_id)
    if section_id:
        q = q.filter(Assignment.section_id == section_id)
    total = q.count()
    assignments = q.order_by(Assignment.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "data": [{
            "id": a.id, "title": a.title, "subject": a.subject_name,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "status": a.status, "grade": None,
        } for a in assignments],
        "skip": skip, "limit": limit,
    }
