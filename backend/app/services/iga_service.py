from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.models.license import License, LicenseType, LicenseStatus
from app.models.school import School
from app.models.server import ServerIdentity
from app.models.user import User
from app.models.student import Student
from app.models.staff_profile import StaffProfile
from app.models.teacher_profile import TeacherProfile
from app.models.parent import Parent
from app.models.branch import Branch
from app.models.payment import Payment
from app.models.audit_log import AuditLog
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta


def get_iga_summary(db: Session):
    now = datetime.now(timezone.utc)
    month_ago = now - relativedelta(months=1)

    total_schools = db.query(func.count(School.id)).filter(School.deleted_at.is_(None)).scalar() or 0
    active_licenses = db.query(func.count(License.id)).filter(License.status == LicenseStatus.ACTIVE).scalar() or 0
    expiring_30d = db.query(func.count(License.id)).filter(
        License.valid_until.between(now, now + relativedelta(days=30)),
        License.status == LicenseStatus.ACTIVE,
    ).scalar() or 0

    servers = db.query(ServerIdentity.server_role, func.count(ServerIdentity.id)).group_by(ServerIdentity.server_role).all()
    server_breakdown = {r: c for r, c in servers}

    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0
    revenue_30d = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.created_at >= month_ago
    ).scalar() or 0

    total_users = db.query(func.count(User.id)).filter(User.deleted_at.is_(None)).scalar() or 0
    new_users_30d = db.query(func.count(User.id)).filter(
        User.created_at >= month_ago
    ).scalar() or 0

    total_students = db.query(func.count(Student.id)).filter(Student.deleted_at.is_(None)).scalar() or 0
    total_teachers = db.query(func.count(TeacherProfile.id)).scalar() or 0
    total_staff = db.query(func.count(StaffProfile.id)).scalar() or 0
    total_parents = db.query(func.count(Parent.id)).scalar() or 0
    total_branches = db.query(func.count(Branch.id)).filter(Branch.deleted_at.is_(None)).scalar() or 0

    audit_30d = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= month_ago
    ).scalar() or 0

    recent_audit = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(20).all()

    monthly_revenue = db.query(
        extract("year", Payment.created_at).label("year"),
        extract("month", Payment.created_at).label("month"),
        func.coalesce(func.sum(Payment.amount), 0).label("total"),
    ).filter(
        Payment.created_at >= (now - relativedelta(months=12)),
    ).group_by("year", "month").order_by("year", "month").all()

    revenue_trend = []
    for r in monthly_revenue:
        key = f"{int(r.year)}-{int(r.month):02d}"
        revenue_trend.append({"period": key, "revenue": float(r.total)})

    return {
        "summary": {
            "total_schools": total_schools,
            "active_licenses": active_licenses,
            "expiring_within_30d": expiring_30d,
            "servers": server_breakdown,
        },
        "finance": {
            "total_revenue": float(total_revenue),
            "revenue_last_30d": float(revenue_30d),
            "revenue_trend": revenue_trend,
        },
        "users": {
            "total_users": total_users,
            "new_users_last_30d": new_users_30d,
            "students": total_students,
            "teachers": total_teachers,
            "staff": total_staff,
            "parents": total_parents,
            "branches": total_branches,
        },
        "activity": {
            "audit_events_last_30d": audit_30d,
            "recent_audit": [
                {
                    "action": a.action,
                    "table_name": a.table_name,
                    "record_id": a.record_id,
                    "user_id": a.user_id,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in recent_audit
            ],
        },
    }
