from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.cache import get_cached_or_compute
from app.models.server import ServerIdentity, ServerRole
from app.models.user import User
from app.models.student import Student
from app.models.staff_profile import StaffProfile
from app.models.branch import Branch
from app.models.school import School
from app.models.academic_year import AcademicYear
from app.models.audit_log import AuditLog
from app.models.event import Event
from app.models.teacher_profile import TeacherProfile
from app.models.parent import Parent
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.license import License, LicenseStatus
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from collections import OrderedDict
from app.services import analytics_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/overview")
def dashboard_overview(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_cached_or_compute(
        "dashboard:overview", request, _compute_dashboard_overview,
        db, current_user, ttl_seconds=60,
    )


def _count_students(db: Session, school_id: int | None, is_super: bool) -> int:
    q = db.query(func.count(Student.id)).filter(Student.deleted_at.is_(None))
    if not is_super:
        q = q.filter(Student.school_id == school_id)
    return q.scalar() or 0


def _count_teachers(db: Session, school_id: int | None, is_super: bool) -> int:
    q = db.query(func.count(TeacherProfile.id))
    if not is_super:
        q = q.filter(TeacherProfile.school_id == school_id)
    return q.scalar() or 0


def _count_staff(db: Session, school_id: int | None, is_super: bool) -> int:
    q = db.query(func.count(StaffProfile.id))
    if not is_super:
        q = q.filter(StaffProfile.school_id == school_id)
    return q.scalar() or 0


def _count_parents(db: Session, school_id: int | None, is_super: bool) -> int:
    q = db.query(func.count(Parent.id))
    if not is_super:
        q = q.filter(Parent.school_id == school_id)
    return q.scalar() or 0


def _count_branches(db: Session, school_id: int | None, is_super: bool) -> int:
    q = db.query(func.count(Branch.id)).filter(Branch.deleted_at.is_(None))
    if not is_super:
        q = q.filter(Branch.school_id == school_id)
    return q.scalar() or 0


def _count_events(db: Session, school_id: int | None, is_super: bool) -> int:
    now = datetime.now(timezone.utc)
    q = db.query(func.count(Event.id)).filter(Event.start_date >= now)
    if not is_super:
        q = q.filter(Event.school_id == school_id)
    return q.scalar() or 0


def _compute_revenue(db: Session, school_id: int | None, is_super: bool) -> float:
    q = db.query(func.coalesce(func.sum(Payment.amount), 0))
    if not is_super:
        q = q.filter(Payment.school_id == school_id)
    return q.scalar() or 0


def _count_pending_invoices(db: Session, school_id: int | None, is_super: bool) -> int:
    q = db.query(func.count(Invoice.id)).filter(Invoice.status == "pending")
    if not is_super:
        q = q.filter(Invoice.school_id == school_id)
    return q.scalar() or 0


def _get_recent_activity(db: Session, school_id: int | None, is_super: bool):
    q = db.query(AuditLog)
    if not is_super:
        q = q.filter(AuditLog.school_id == school_id)
    return q.order_by(AuditLog.created_at.desc()).limit(10).all()


def _compute_dashboard_overview(db: Session, current_user: User):
    school_id = current_user.school_id
    is_super = school_id is None

    students = _count_students(db, school_id, is_super)
    teachers = _count_teachers(db, school_id, is_super)
    staff = _count_staff(db, school_id, is_super)
    parents = _count_parents(db, school_id, is_super)
    branches = _count_branches(db, school_id, is_super)
    events = _count_events(db, school_id, is_super)
    revenue = _compute_revenue(db, school_id, is_super)
    pending_invoices = _count_pending_invoices(db, school_id, is_super)
    recent_activity = _get_recent_activity(db, school_id, is_super)

    if is_super:
        all_schools = db.query(func.count(School.id)).filter(School.deleted_at.is_(None)).scalar() or 0
        active_licenses = db.query(func.count(License.id)).filter(License.status == "active").scalar() or 0
        servers = db.query(ServerIdentity.server_role, func.count(ServerIdentity.id)).group_by(ServerIdentity.server_role).all()
        server_counts = {r: c for r, c in servers}
        academic_year = None
    else:
        all_schools = 0
        active_licenses = 0
        server_counts = {}
        academic_year = db.query(AcademicYear).filter(
            AcademicYear.school_id == school_id, AcademicYear.is_current == True
        ).first()

    alerts = []
    now_utc = datetime.now(timezone.utc)
    thirty_days = now_utc + relativedelta(days=30)

    lic_filter = [License.valid_until.between(now_utc, thirty_days), License.status == LicenseStatus.ACTIVE]
    if not is_super:
        lic_filter.append(License.school_id == school_id)

    expiring_licenses = db.query(License).filter(*lic_filter).all()
    for lic in expiring_licenses:
        days_left = (lic.valid_until - now_utc).days
        severity = "destructive" if days_left <= 7 else "warning" if days_left <= 14 else "info"
        alerts.append({
            "message": f"License {lic.key} expires in {days_left} days",
            "severity": severity,
            "time": f"{days_left}d remaining",
        })

    if pending_invoices > 0:
        pct = pending_invoices
        alerts.append({
            "message": f"{pct} pending invoice{'s' if pct > 1 else ''} require attention",
            "severity": "warning",
            "time": "now",
        })

    return {
        "totals": {
            "students": students,
            "teachers": teachers,
            "staff": staff,
            "parents": parents,
            "branches": branches,
            "events": events,
        },
        "finance": {
            "revenue": float(revenue),
            "pending_invoices": pending_invoices,
        },
        "academic_year": {
            "name": academic_year.name if academic_year else None,
            "is_current": academic_year.is_current if academic_year else False,
        } if academic_year else None,
        "super_admin": {
            "total_schools": all_schools,
            "active_licenses": active_licenses,
            "servers": server_counts,
        },
        "alerts": alerts,
        "recent_activity": [
            {
                "action": a.action,
                "table_name": a.table_name,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "user_id": a.user_id,
            }
            for a in recent_activity
        ],
    }


def _rows_to_month_map(rows, value_extractor):
    for r in rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        yield key, value_extractor(r)


def _fill_month_trend(data_map, key_name, months, now, month_labels):
    trend = []
    for i in range(months):
        d = now - relativedelta(months=months - 1 - i)
        key = d.strftime("%Y-%m")
        trend.append({"month": month_labels[i], key_name: data_map.get(key, 0)})
    return trend


@router.get("/dashboard/trends")
def dashboard_trends(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    month_labels = []
    for i in range(months - 1, -1, -1):
        d = now - relativedelta(months=i)
        month_labels.append(d.strftime("%b"))

    school_id = current_user.school_id
    is_super = school_id is None

    school_filter = School.deleted_at.is_(None)
    if not is_super:
        school_filter = (School.id == school_id) & School.deleted_at.is_(None)

    school_rows = db.query(
        extract("year", School.created_at).label("year"),
        extract("month", School.created_at).label("month"),
        func.count(School.id).label("cnt"),
    ).filter(
        school_filter,
        School.created_at >= (now - relativedelta(months=months)),
    ).group_by("year", "month").order_by("year", "month").all()

    rev_filter = [Payment.created_at >= (now - relativedelta(months=months))]
    if not is_super:
        rev_filter.append(Payment.school_id == school_id)

    revenue_rows = db.query(
        extract("year", Payment.created_at).label("year"),
        extract("month", Payment.created_at).label("month"),
        func.coalesce(func.sum(Payment.amount), 0).label("total"),
    ).filter(*rev_filter).group_by("year", "month").order_by("year", "month").all()

    stu_filter = [Student.deleted_at.is_(None), Student.created_at >= (now - relativedelta(months=months))]
    if not is_super:
        stu_filter.append(Student.school_id == school_id)

    enrollment_rows = db.query(
        extract("year", Student.created_at).label("year"),
        extract("month", Student.created_at).label("month"),
        func.count(Student.id).label("cnt"),
    ).filter(*stu_filter).group_by("year", "month").order_by("year", "month").all()

    school_map = dict(_rows_to_month_map(school_rows, lambda r: r.cnt))
    rev_map = dict(_rows_to_month_map(revenue_rows, lambda r: float(r.total)))
    enroll_map = dict(_rows_to_month_map(enrollment_rows, lambda r: r.cnt))

    school_trend = _fill_month_trend(school_map, "schools", months, now, month_labels)
    rev_trend = _fill_month_trend(rev_map, "revenue", months, now, month_labels)
    enrollment_trend = _fill_month_trend(enroll_map, "students", months, now, month_labels)

    return {
        "school_growth": school_trend,
        "revenue_trend": rev_trend,
        "enrollment_trend": enrollment_trend,
    }


@router.get("/analytics/grade-distribution")
def grade_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_grade_distribution(db, current_user.school_id)


@router.get("/analytics/staff-distribution")
def staff_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_staff_distribution(db, current_user.school_id)


@router.get("/analytics/attendance-summary")
def attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_attendance_summary(db, current_user.school_id)


@router.get("/analytics/trends")
def analytics_trends(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_trends(db, current_user.school_id, months)
