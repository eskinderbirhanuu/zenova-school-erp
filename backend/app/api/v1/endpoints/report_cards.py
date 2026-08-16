from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.report_card import ReportCard
from app.models.exam import Exam, ExamResult
from app.models.student import Student
from app.models.subject import Subject
from app.models.class_ import ClassGrade
from app.models.academic_year import Semester
from app.schemas.report_card import ReportCardResponse, ReportCardDetail
from app.utils.grading import compute_grade, compute_subject_grades
from app.core.permissions import has_permission, Permission
from datetime import datetime
import uuid

router = APIRouter(tags=["report-cards"])


def _resolve_accessible_student_ids(db: Session, current_user: User) -> set[str] | None:
    """Student IDs the current user may see report cards for.

    Returns ``None`` for staff who can view any student in their school
    (STUDENT_VIEW), otherwise the specific students owned by the account: the
    student themself (``Student.user_id``) and any children of a linked parent
    (``Parent.user_id`` + ``ParentStudentLink``). (Gap P1 ownership gate.)
    """
    if current_user.is_superuser or has_permission(current_user, Permission.STUDENT_VIEW):
        return None

    from app.models.parent import Parent
    from app.models.parent_student_link import ParentStudentLink

    ids: set[str] = set()

    student = db.query(Student).filter(
        Student.user_id == current_user.id,
        Student.school_id == current_user.school_id,
    ).first()
    if student:
        ids.add(student.id)

    parent = db.query(Parent).filter(
        Parent.user_id == current_user.id,
        Parent.school_id == current_user.school_id,
    ).first()
    if parent:
        links = db.query(ParentStudentLink).filter(
            ParentStudentLink.parent_id == parent.id,
        ).all()
        ids.update(l.student_id for l in links)

    return ids


def _require_card_access(db: Session, current_user: User, card: ReportCard) -> None:
    """Raise 404 (not 403, to avoid leaking card existence) when the user does
    not own the report card. (Gap P1 ownership gate.)"""
    accessible = _resolve_accessible_student_ids(db, current_user)
    if accessible is None or card.student_id in accessible:
        return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report card not found")


def _build_result_map(results, exams):
    result_map = {}
    for r in results:
        exam = next((e for e in exams if e.id == r.exam_id), None)
        if exam and exam.subject_id:
            if exam.subject_id not in result_map:
                result_map[exam.subject_id] = []
            result_map[exam.subject_id].append({
                "exam_name": exam.name,
                "score": r.score,
                "max_score": exam.max_score,
                "grade": r.grade,
            })
    return result_map


@router.get("/report-cards", response_model=list[ReportCardResponse])
def list_report_cards(
    student_id: str = Query(None),
    semester_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ReportCard).filter(ReportCard.school_id == current_user.school_id)
    if student_id:
        q = q.filter(ReportCard.student_id == student_id)
    if semester_id:
        q = q.filter(ReportCard.semester_id == semester_id)
    accessible = _resolve_accessible_student_ids(db, current_user)
    if accessible is not None:
        if not accessible:
            return []
        q = q.filter(ReportCard.student_id.in_(accessible))
    cards = q.order_by(ReportCard.generated_at.desc()).all()
    return [
        ReportCardResponse(
            id=c.id, school_id=c.school_id, student_id=c.student_id,
            semester_id=c.semester_id, academic_year_id=c.academic_year_id,
            pdf_url=c.pdf_url, generated_at=c.generated_at,
        )
        for c in cards
    ]


@router.post("/report-cards/generate", status_code=status.HTTP_201_CREATED)
def generate_report_card(
    student_id: str,
    semester_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Gap P1: report-card generation is a staff write action. Any authenticated
    # user (PARENT/STUDENT etc.) must not be able to mint cards.
    if not (current_user.is_superuser or has_permission(current_user, Permission.STUDENT_VIEW)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to generate report cards")

    student = db.query(Student).filter(
        Student.id == student_id,
        Student.school_id == current_user.school_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    semester = db.query(Semester).filter(
        Semester.id == semester_id,
        Semester.school_id == current_user.school_id,
    ).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")

    existing = db.query(ReportCard).filter(
        ReportCard.student_id == student_id,
        ReportCard.semester_id == semester_id,
        ReportCard.school_id == current_user.school_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Report card already exists for this student/semester")

    class_ = db.query(ClassGrade).filter(ClassGrade.id == student.grade_id).first()

    exams = db.query(Exam).filter(
        Exam.semester_id == semester_id,
        Exam.class_id == student.grade_id,
        Exam.school_id == current_user.school_id,
    ).all()
    exam_ids = [e.id for e in exams]

    results = db.query(ExamResult).filter(
        ExamResult.student_id == student_id,
        ExamResult.exam_id.in_(exam_ids),
    ).all() if exam_ids else []

    result_map = _build_result_map(results, exams)

    subjects = db.query(Subject).filter(
        Subject.id.in_(list(result_map.keys())),
    ).all() if result_map else []
    subject_map = {s.id: s.name for s in subjects}

    subject_grades, total_pct, count = compute_subject_grades(result_map, subject_map)
    overall = round(total_pct / count, 1) if count > 0 else 0
    overall_grade = compute_grade(overall)

    card = ReportCard(
        id=str(uuid.uuid4()),
        school_id=current_user.school_id,
        student_id=student_id,
        semester_id=semester_id,
        academic_year_id=semester.academic_year_id,
    )
    db.add(card)
    db.commit()
    db.refresh(card)

    return {
        "id": card.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "student_id": student.student_id,
        "class": class_.name if class_ else "",
        "semester": semester.name,
        "overall_percentage": overall,
        "overall_grade": overall_grade,
        "subject_grades": subject_grades,
        "generated_at": card.generated_at.isoformat() if card.generated_at else None,
    }


@router.get("/report-cards/{card_id}", response_model=ReportCardDetail)
def get_report_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.query(ReportCard).filter(
        ReportCard.id == card_id,
        ReportCard.school_id == current_user.school_id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Report card not found")

    _require_card_access(db, current_user, card)

    student = db.query(Student).filter(Student.id == card.student_id).first()
    semester = db.query(Semester).filter(Semester.id == card.semester_id).first()
    class_ = db.query(ClassGrade).filter(ClassGrade.id == student.grade_id).first() if student else None

    exams = db.query(Exam).filter(
        Exam.semester_id == card.semester_id,
        Exam.class_id == student.grade_id if student else None,
        Exam.school_id == current_user.school_id,
    ).all()
    exam_ids = [e.id for e in exams]

    results = db.query(ExamResult).filter(
        ExamResult.student_id == card.student_id,
        ExamResult.exam_id.in_(exam_ids),
    ).all() if exam_ids else []

    result_map = _build_result_map(results, exams)

    subjects = db.query(Subject).filter(
        Subject.id.in_(list(result_map.keys())),
    ).all() if result_map else []
    subject_map = {s.id: s.name for s in subjects}

    subject_grades, total_pct, count = compute_subject_grades(result_map, subject_map)
    overall = round(total_pct / count, 1) if count > 0 else 0
    overall_grade = compute_grade(overall)

    return ReportCardDetail(
        id=card.id,
        student_name=f"{student.first_name} {student.last_name}" if student else "",
        student_id=student.student_id if student else "",
        class_name=class_.name if class_ else "",
        semester_name=semester.name if semester else "",
        overall_percentage=overall,
        overall_grade=overall_grade,
        subject_grades=subject_grades,
        generated_at=card.generated_at,
    )
