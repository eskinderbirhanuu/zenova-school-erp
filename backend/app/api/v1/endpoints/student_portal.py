from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.exam import Exam, ExamResult
from app.models.subject import Subject
from app.models.assignment import Assignment
from app.models.timetable import TimetableEntry
from app.models.classroom import Classroom
from app.models.wallet import Wallet
from app.models.invoice import Invoice, InvoiceLine
from app.models.payment import Payment
from app.models.student_document import StudentDocument
from datetime import date, datetime, timezone
from sqlalchemy import func

router = APIRouter(tags=["student-portal"])


def _build_attendance_summary(db: Session, student_id: int) -> dict:
    today = date.today()
    start_of_term = today.replace(month=1, day=1)
    att_rows = db.query(Attendance.status, func.count(Attendance.id)).filter(
        Attendance.student_id == student_id,
        Attendance.date >= start_of_term,
    ).group_by(Attendance.status).all()
    total_records = 0
    present_records = 0
    absent_records = 0
    late_records = 0
    for status, cnt in att_rows:
        total_records += cnt
        if status == "present":
            present_records = cnt
        elif status == "absent":
            absent_records = cnt
        elif status == "late":
            late_records = cnt
    attendance_pct = round((present_records / total_records * 100) if total_records > 0 else 0, 1)
    return {
        "attendance_pct": attendance_pct,
        "total_days": total_records,
        "present_days": present_records,
        "absent_days": absent_records,
        "late_days": late_records,
    }


def _build_exam_results(db: Session, student_id: int) -> list:
    results = db.query(ExamResult).filter(
        ExamResult.student_id == student_id,
    ).order_by(ExamResult.created_at.desc()).limit(10).all()

    exam_ids = list(set(r.exam_id for r in results))
    exams_map = {}
    if exam_ids:
        for e in db.query(Exam).filter(Exam.id.in_(exam_ids)).all():
            exams_map[e.id] = e

    subject_ids = list(set(e.subject_id for e in exams_map.values() if e.subject_id))
    subjects_map = {}
    if subject_ids:
        for s in db.query(Subject).filter(Subject.id.in_(subject_ids)).all():
            subjects_map[s.id] = s

    subject_grades = []
    seen_subjects = set()
    for r in results:
        exam = exams_map.get(r.exam_id)
        if exam and exam.subject_id and exam.subject_id not in seen_subjects:
            subj = subjects_map.get(exam.subject_id)
            subject_grades.append({
                "subject": subj.name if subj else "Unknown",
                "score": r.score,
                "max_score": exam.max_score,
                "grade": r.grade,
            })
            seen_subjects.add(exam.subject_id)

    return subject_grades


def _build_schedule(db: Session, section_id: int) -> list:
    if not section_id:
        return []
    today = date.today()
    day_index = today.weekday()
    entries = db.query(TimetableEntry).filter(
        TimetableEntry.section_id == section_id,
        TimetableEntry.day_of_week == day_index,
    ).order_by(TimetableEntry.start_time).all()

    subject_ids = [e.subject_id for e in entries if e.subject_id]
    classroom_ids = [e.classroom_id for e in entries if e.classroom_id]
    subj_map = {}
    if subject_ids:
        for s in db.query(Subject).filter(Subject.id.in_(subject_ids)).all():
            subj_map[s.id] = s
    room_map = {}
    if classroom_ids:
        for r in db.query(Classroom).filter(Classroom.id.in_(classroom_ids)).all():
            room_map[r.id] = r

    today_schedule = []
    for e in entries:
        subj = subj_map.get(e.subject_id) if e.subject_id else None
        room = room_map.get(e.classroom_id) if e.classroom_id else None
        today_schedule.append({
            "time": str(e.start_time)[:5] if e.start_time else "",
            "subject": subj.name if subj else "",
            "room": room.name if room else "",
        })
    return today_schedule


def _build_assignments(db: Session, school_id: int) -> list:
    upcoming = db.query(Assignment).filter(
        Assignment.school_id == school_id,
    ).order_by(Assignment.created_at.desc()).limit(5).all()

    assignments_list = []
    for a in upcoming:
        assignments_list.append({
            "title": a.title,
            "subject": a.subject_name or "",
            "due_date": str(a.due_date) if a.due_date else "",
        })
    return assignments_list


def _build_wallet(db: Session, student_id: int) -> float:
    wallet = db.query(Wallet).filter(Wallet.student_id == student_id).first()
    return float(wallet.balance) if wallet else 0.0


@router.get("/student-portal/dashboard")
def student_portal_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    att = _build_attendance_summary(db, student.id)
    subject_grades = _build_exam_results(db, student.id)
    today_schedule = _build_schedule(db, student.section_id)
    assignments_list = _build_assignments(db, current_user.school_id)
    wallet_balance = _build_wallet(db, student.id)

    return {
        "student_name": f"{student.first_name} {student.last_name}",
        "student_id": student.student_id,
        "grade_id": student.grade_id,
        **att,
        "subject_grades": subject_grades,
        "today_schedule": today_schedule,
        "upcoming_assignments": assignments_list,
        "wallet_balance": wallet_balance,
    }


def _get_student_for_user(db: Session, current_user: User) -> Student:
    student = db.query(Student).filter(
        Student.user_id == current_user.id,
        Student.school_id == current_user.school_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/student-portal/finance")
def student_portal_finance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gap S1: student's own fee/invoice + payment history (ownership-scoped)."""
    student = _get_student_for_user(db, current_user)

    invoices = db.query(Invoice).filter(
        Invoice.student_id == student.id,
        Invoice.school_id == current_user.school_id,
        Invoice.deleted_at.is_(None),
    ).order_by(Invoice.due_date.desc()).all()

    invoice_ids = [inv.id for inv in invoices]
    lines_by_invoice: dict[str, list] = {}
    if invoice_ids:
        for line in db.query(InvoiceLine).filter(InvoiceLine.invoice_id.in_(invoice_ids)).all():
            lines_by_invoice.setdefault(line.invoice_id, []).append(line)

    total_billed = sum(float(inv.total_amount) for inv in invoices)
    total_paid = sum(float(inv.paid_amount) for inv in invoices)
    outstanding = total_billed - total_paid

    payments = db.query(Payment).filter(
        Payment.student_id == student.id,
        Payment.school_id == current_user.school_id,
        Payment.deleted_at.is_(None),
    ).order_by(Payment.payment_date.desc()).limit(20).all()

    return {
        "student_name": f"{student.first_name} {student.last_name}",
        "student_id": student.student_id,
        "wallet_balance": _build_wallet(db, student.id),
        "total_billed": round(total_billed, 2),
        "total_paid": round(total_paid, 2),
        "outstanding_balance": round(outstanding, 2),
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "total_amount": float(inv.total_amount),
                "paid_amount": float(inv.paid_amount),
                "balance": round(float(inv.total_amount) - float(inv.paid_amount), 2),
                "status": inv.status,
                "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "lines": [
                    {"description": line.description, "amount": float(line.amount)}
                    for line in lines_by_invoice.get(inv.id, [])
                ],
            }
            for inv in invoices
        ],
        "payment_history": [
            {
                "id": p.id,
                "payment_number": p.payment_number,
                "amount": float(p.amount),
                "method": p.payment_method,
                "payment_date": p.payment_date.isoformat() if p.payment_date else None,
                "reference": p.reference,
            }
            for p in payments
        ],
    }


@router.get("/student-portal/documents")
def student_portal_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gap S2: student's own documents (metadata only, read-only, ownership-scoped)."""
    student = _get_student_for_user(db, current_user)

    docs = db.query(StudentDocument).filter(
        StudentDocument.student_id == student.id,
        StudentDocument.deleted_at.is_(None),
    ).order_by(StudentDocument.created_at.desc()).all()

    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "file_url": doc.file_url,
            "file_type": doc.file_type,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in docs
    ]