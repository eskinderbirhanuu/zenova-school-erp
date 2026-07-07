from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from dateutil.relativedelta import relativedelta

from app.models.student import Student
from app.models.teacher_profile import TeacherProfile
from app.models.staff_profile import StaffProfile
from app.models.parent import Parent
from app.models.class_ import ClassGrade
from app.models.branch import Branch
from app.models.event import Event
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.attendance import Attendance
from app.models.school import School


def get_overview_totals(db: Session, school_id: str | None):
    is_super = school_id is None

    def _count(model, **filters):
        q = db.query(func.count(model.id))
        for col, val in filters.items():
            q = q.filter(getattr(model, col) == val)
        return q.scalar() or 0

    if is_super:
        students = _count(Student, deleted_at=None)
        teachers = _count(TeacherProfile)
        staff = _count(StaffProfile)
        parents = _count(Parent)
        branches = _count(Branch, deleted_at=None)
    else:
        students = _count(Student, school_id=school_id, deleted_at=None)
        teachers = _count(TeacherProfile, school_id=school_id)
        staff = _count(StaffProfile, school_id=school_id)
        parents = _count(Parent, school_id=school_id)
        branches = _count(Branch, school_id=school_id, deleted_at=None)

    now = datetime.now(timezone.utc)
    events = _count(Event) if is_super else _count(Event, school_id=school_id)

    rev_filter = [] if is_super else [Payment.school_id == school_id]
    revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(*rev_filter).scalar() or 0

    inv_filter = [Invoice.status == "pending"]
    if not is_super:
        inv_filter.append(Invoice.school_id == school_id)
    pending_invoices = db.query(func.count(Invoice.id)).filter(*inv_filter).scalar() or 0

    return {
        "students": students,
        "teachers": teachers,
        "staff": staff,
        "parents": parents,
        "branches": branches,
        "events": events,
        "revenue": float(revenue),
        "pending_invoices": pending_invoices,
    }


def get_grade_distribution(db: Session, school_id: str) -> list[dict]:
    counts = db.query(
        ClassGrade.name,
        func.sum(case((Student.gender == "female", 1), else_=0)).label("girls"),
        func.sum(case((Student.gender == "male", 1), else_=0)).label("boys"),
    ).outerjoin(Student, Student.grade_id == ClassGrade.id
    ).filter(
        ClassGrade.school_id == school_id,
        Student.school_id == school_id,
    ).group_by(ClassGrade.id, ClassGrade.name
    ).order_by(ClassGrade.name).all()
    return [{"grade": name, "boys": int(boys), "girls": int(girls)} for name, girls, boys in counts]


def get_staff_distribution(db: Session, school_id: str) -> list[dict]:
    teachers = db.query(func.count(TeacherProfile.id)).filter(
        TeacherProfile.school_id == school_id,
    ).scalar() or 0
    staff = db.query(func.count(StaffProfile.id)).filter(
        StaffProfile.school_id == school_id,
    ).scalar() or 0
    return [{"name": "Teachers", "value": teachers}, {"name": "Staff", "value": staff}]


def get_trends(db: Session, school_id: str | None, months: int = 12) -> dict:
    now = datetime.now(timezone.utc)
    month_labels = [(now - relativedelta(months=i)).strftime("%b") for i in range(months - 1, -1, -1)]

    rev_filter = [Payment.created_at >= (now - relativedelta(months=months))]
    if school_id:
        rev_filter.append(Payment.school_id == school_id)

    revenue_rows = db.query(
        extract("year", Payment.created_at).label("year"),
        extract("month", Payment.created_at).label("month"),
        func.coalesce(func.sum(Payment.amount), 0).label("total"),
    ).filter(*rev_filter).group_by("year", "month").order_by("year", "month").all()

    stu_filter = [Student.deleted_at.is_(None), Student.created_at >= (now - relativedelta(months=months))]
    if school_id:
        stu_filter.append(Student.school_id == school_id)

    enrollment_rows = db.query(
        extract("year", Student.created_at).label("year"),
        extract("month", Student.created_at).label("month"),
        func.count(Student.id).label("cnt"),
    ).filter(*stu_filter).group_by("year", "month").order_by("year", "month").all()

    att_filter = [Attendance.created_at >= (now - relativedelta(months=months))]
    if school_id:
        att_filter.append(Attendance.school_id == school_id)

    attendance_rows = db.query(
        extract("year", Attendance.created_at).label("year"),
        extract("month", Attendance.created_at).label("month"),
        func.count(Attendance.id).label("cnt"),
    ).filter(*att_filter).group_by("year", "month").order_by("year", "month").all()

    rev_map = {}
    enroll_map = {}
    att_map = {}
    for r in revenue_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        rev_map[key] = float(r.total)
    for r in enrollment_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        enroll_map[key] = r.cnt
    for r in attendance_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        att_map[key] = r.cnt

    rev_trend, enrollment_trend, attendance_trend = [], [], []
    for i in range(months):
        d = now - relativedelta(months=months - 1 - i)
        key = d.strftime("%Y-%m")
        rev_trend.append({"month": month_labels[i], "revenue": rev_map.get(key, 0)})
        enrollment_trend.append({"month": month_labels[i], "students": enroll_map.get(key, 0)})
        attendance_trend.append({"month": month_labels[i], "scans": att_map.get(key, 0)})

    return {
        "revenue_trend": rev_trend,
        "enrollment_trend": enrollment_trend,
        "attendance_trend": attendance_trend,
    }


def get_attendance_summary(db: Session, school_id: str) -> dict:
    today = datetime.now(timezone.utc).date()
    total = db.query(func.count(Attendance.id)).filter(
        Attendance.school_id == school_id,
        func.date(Attendance.created_at) == today,
    ).scalar() or 0
    return {"today": total}
