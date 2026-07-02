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
from datetime import datetime
import uuid

router = APIRouter(tags=["report-cards"])


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

    subjects = db.query(Subject).filter(
        Subject.id.in_(list(result_map.keys())),
    ).all() if result_map else []
    subject_map = {s.id: s.name for s in subjects}

    subject_grades = []
    total_pct = 0
    count = 0
    for subj_id, scores in result_map.items():
        avg = sum(s["score"] for s in scores) / len(scores)
        max_avg = sum(s["max_score"] for s in scores) / len(scores) if scores else 1
        pct = round((avg / max_avg) * 100, 1) if max_avg > 0 else 0
        letter = compute_grade(pct)
        subject_grades.append({
            "subject": subject_map.get(subj_id, "Unknown"),
            "average": round(avg, 1),
            "max": round(max_avg, 1),
            "percentage": pct,
            "grade": letter,
            "exams": scores,
        })
        total_pct += pct
        count += 1

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
