from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database import get_db
from app.api.v1.deps import get_current_user
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school_id = current_user.school_id
    is_super = school_id is None

    if is_super:
        students = db.query(func.count(Student.id)).filter(Student.deleted_at.is_(None)).scalar() or 0
        teachers = db.query(func.count(TeacherProfile.id)).scalar() or 0
        staff = db.query(func.count(StaffProfile.id)).scalar() or 0
        parents = db.query(func.count(Parent.id)).scalar() or 0
        branches = db.query(func.count(Branch.id)).filter(Branch.deleted_at.is_(None)).scalar() or 0
        events = db.query(func.count(Event.id)).filter(Event.start_date >= datetime.now(timezone.utc)).scalar() or 0
        revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0
        pending_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == "pending").scalar() or 0
        all_schools = db.query(func.count(School.id)).filter(School.deleted_at.is_(None)).scalar() or 0
        active_licenses = db.query(func.count(License.id)).filter(License.status == "active").scalar() or 0
        servers = db.query(ServerIdentity.server_role, func.count(ServerIdentity.id)).group_by(ServerIdentity.server_role).all()
        server_counts = {r: c for r, c in servers}
        recent_activity = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
        academic_year = None
    else:
        students = db.query(func.count(Student.id)).filter(
            Student.school_id == school_id, Student.deleted_at.is_(None)
        ).scalar() or 0
        teachers = db.query(func.count(TeacherProfile.id)).filter(
            TeacherProfile.school_id == school_id
        ).scalar() or 0
        staff = db.query(func.count(StaffProfile.id)).filter(
            StaffProfile.school_id == school_id
        ).scalar() or 0
        parents = db.query(func.count(Parent.id)).filter(
            Parent.school_id == school_id
        ).scalar() or 0
        branches = db.query(func.count(Branch.id)).filter(
            Branch.school_id == school_id, Branch.deleted_at.is_(None)
        ).scalar() or 0
        academic_year = db.query(AcademicYear).filter(
            AcademicYear.school_id == school_id, AcademicYear.is_current == True
        ).first()
        now = datetime.now(timezone.utc)
        events = db.query(func.count(Event.id)).filter(
            Event.school_id == school_id, Event.start_date >= now
        ).scalar() or 0
        revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.school_id == school_id
        ).scalar() or 0
        pending_invoices = db.query(func.count(Invoice.id)).filter(
            Invoice.school_id == school_id, Invoice.status == "pending"
        ).scalar() or 0
        recent_activity = db.query(AuditLog).filter(
            AuditLog.school_id == school_id
        ).order_by(AuditLog.created_at.desc()).limit(10).all()
        all_schools = 0
        active_licenses = 0
        server_counts = {}

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

    school_map = {}
    rev_map = {}
    enroll_map = {}
    for r in school_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        school_map[key] = r.cnt
    for r in revenue_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        rev_map[key] = float(r.total)
    for r in enrollment_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        enroll_map[key] = r.cnt

    school_trend = []
    rev_trend = []
    enrollment_trend = []
    for i in range(months):
        d = now - relativedelta(months=months - 1 - i)
        key = d.strftime("%Y-%m")
        school_trend.append({"month": month_labels[i], "schools": school_map.get(key, 0)})
        rev_trend.append({"month": month_labels[i], "revenue": rev_map.get(key, 0)})
        enrollment_trend.append({"month": month_labels[i], "students": enroll_map.get(key, 0)})

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
