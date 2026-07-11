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
from datetime import date, datetime, timezone
from sqlalchemy import func

router = APIRouter(tags=["student-portal"])


@router.get("/student-portal/dashboard")
def student_portal_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    today = date.today()
    start_of_term = today.replace(month=1, day=1)
    att_rows = db.query(Attendance.status, func.count(Attendance.id)).filter(
        Attendance.student_id == student.id,
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

    # Recent exam results
    results = db.query(ExamResult).filter(
        ExamResult.student_id == student.id,
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

    today_schedule = []
    if student.section_id:
        day_index = today.weekday()
        entries = db.query(TimetableEntry).filter(
            TimetableEntry.section_id == student.section_id,
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

        for e in entries:
            subj = subj_map.get(e.subject_id) if e.subject_id else None
            room = room_map.get(e.classroom_id) if e.classroom_id else None
            today_schedule.append({
                "time": str(e.start_time)[:5] if e.start_time else "",
                "subject": subj.name if subj else "",
                "room": room.name if room else "",
            })

    # Upcoming assignments
    upcoming = db.query(Assignment).filter(
        Assignment.school_id == current_user.school_id,
    ).order_by(Assignment.created_at.desc()).limit(5).all()

    assignments_list = []
    for a in upcoming:
        assignments_list.append({
            "title": a.title,
            "subject": a.subject_name or "",
            "due_date": str(a.due_date) if a.due_date else "",
        })

    # Wallet
    wallet = db.query(Wallet).filter(Wallet.student_id == student.id).first()
    wallet_balance = float(wallet.balance) if wallet else 0.0

    return {
        "student_name": f"{student.first_name} {student.last_name}",
        "student_id": student.student_id,
        "grade_id": student.grade_id,
        "attendance_pct": attendance_pct,
        "total_days": total_records,
        "present_days": present_records,
        "absent_days": absent_records,
        "late_days": late_records,
        "subject_grades": subject_grades,
        "today_schedule": today_schedule,
        "upcoming_assignments": assignments_list,
        "wallet_balance": wallet_balance,
    }
