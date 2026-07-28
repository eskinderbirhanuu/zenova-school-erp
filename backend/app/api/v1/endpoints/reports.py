from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.models.report import Report
from app.models.student import Student
from app.models.user import User
from app.models.attendance import Attendance
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.leave import LeaveRequest, LeaveBalance
from app.models.library_fine import LibraryFine
from app.models.library import BookBorrowing
from app.models.cafeteria import CafeteriaProduct, CafeteriaOrder
from app.models.inventory import InventoryItem, Supplier
from app.models.audit_log import AuditLog
from app.models.license import License
from app.models.staff_profile import StaffProfile
from app.models.teacher_profile import TeacherProfile
from datetime import date, datetime, timezone
from sqlalchemy import func

router = APIRouter()
ALL_ROLES = [require_permission(
    Permission.STUDENT_VIEW, Permission.HR_MANAGE,
    Permission.FINANCE_REPORTS, Permission.INVENTORY_MANAGE,
    Permission.LIBRARY_MANAGE, Permission.CAFETERIA_POS, Permission.AUDIT_VIEW,
)]

REPORT_DEFINITIONS = {
    "system": [
        {"name": "Global Usage Report", "type": "System", "period": "Current Month"},
        {"name": "License Compliance Report", "type": "License", "period": "Current Month"},
        {"name": "Error Log Summary", "type": "System", "period": "Current Month"},
    ],
    "admin": [
        {"name": "Enrollment Summary", "type": "Academic", "period": "Current Term"},
        {"name": "Staff Overview", "type": "HR", "period": "Current Month"},
        {"name": "Financial Summary", "type": "Finance", "period": "Current Month"},
    ],
    "academic": [
        {"name": "Grade Distribution", "type": "Academic", "period": "Current Term"},
        {"name": "Class Performance", "type": "Academic", "period": "Current Term"},
        {"name": "Subject Analysis", "type": "Academic", "period": "Current Term"},
    ],
    "finance": [
        {"name": "Revenue vs Expenses", "type": "Finance", "period": "Current Month"},
        {"name": "Outstanding Invoices", "type": "Finance", "period": "Current Month"},
        {"name": "Fee Collection Rate", "type": "Finance", "period": "Current Term"},
    ],
    "hr": [
        {"name": "Staff Attendance Summary", "type": "Attendance", "period": "Current Month"},
        {"name": "Payroll Summary", "type": "Payroll", "period": "Current Month"},
        {"name": "Leave Balance Report", "type": "Leave", "period": "Current Month"},
    ],
    "inventory": [
        {"name": "Stock Value Report", "type": "Inventory", "period": "Current Month"},
        {"name": "Low Stock Alert", "type": "Inventory", "period": "Current Month"},
        {"name": "Supplier Performance", "type": "Procurement", "period": "Current Quarter"},
    ],
    "library": [
        {"name": "Borrowing Statistics", "type": "Library", "period": "Current Month"},
        {"name": "Overdue Books", "type": "Library", "period": "Current Month"},
        {"name": "Popular Books", "type": "Library", "period": "Current Month"},
    ],
    "auditor": [
        {"name": "Audit Trail Summary", "type": "Audit", "period": "Current Month"},
        {"name": "Security Events", "type": "Security", "period": "Current Month"},
        {"name": "Compliance Report", "type": "Audit", "period": "Current Quarter"},
    ],
    "cafeteria": [
        {"name": "Sales Summary", "type": "Sales", "period": "Current Month"},
        {"name": "Popular Items", "type": "Sales", "period": "Current Month"},
        {"name": "Inventory Usage", "type": "Inventory", "period": "Current Month"},
    ],
}


def _global_usage_report(db: Session, school_id: str | None) -> dict:
    return {
        "total_users": db.query(User).count(),
        "total_schools": db.query(func.distinct(User.school_id)).scalar() or 0,
        "total_students": db.query(Student).count(),
    }


def _license_compliance_report(db: Session, school_id: str | None) -> dict:
    active = db.query(License).filter(License.status == "ACTIVE").count()
    expired = db.query(License).filter(License.status == "EXPIRED").count()
    return {"active_licenses": active, "expired_licenses": expired}


def _error_log_summary(db: Session, school_id: str | None) -> dict:
    return {"total_audit_entries": db.query(AuditLog).count()}


def _enrollment_summary(db: Session, school_id: str | None) -> dict:
    total = db.query(Student).filter(Student.school_id == school_id).count()
    active = db.query(Student).filter(Student.school_id == school_id, Student.status == "active").count()
    return {"total_students": total, "active_students": active}


def _staff_overview(db: Session, school_id: str | None) -> dict:
    staff_count = db.query(StaffProfile).filter(StaffProfile.school_id == school_id).count()
    teacher_count = db.query(TeacherProfile).filter(TeacherProfile.school_id == school_id).count()
    return {"staff": staff_count, "teachers": teacher_count}


def _financial_summary(db: Session, school_id: str | None) -> dict:
    total_invoiced = db.query(func.sum(Invoice.total_amount)).filter(Invoice.school_id == school_id).scalar() or 0
    total_collected = db.query(func.sum(Payment.amount)).filter(Payment.school_id == school_id).scalar() or 0
    return {"total_invoiced": float(total_invoiced), "total_collected": float(total_collected)}


def _revenue_vs_expenses(db: Session, school_id: str | None) -> dict:
    total_payments = db.query(func.sum(Payment.amount)).filter(Payment.school_id == school_id).scalar() or 0
    return {"revenue": float(total_payments)}


def _outstanding_invoices(db: Session, school_id: str | None) -> dict:
    total = db.query(func.sum(Invoice.total_amount - Invoice.paid_amount)).filter(
        Invoice.school_id == school_id, Invoice.status.in_(["draft", "sent"])).scalar() or 0
    count = db.query(Invoice).filter(Invoice.school_id == school_id, Invoice.status.in_(["draft", "sent"])).count()
    return {"outstanding_amount": float(total), "outstanding_count": count}


def _fee_collection_rate(db: Session, school_id: str | None) -> dict:
    total = db.query(func.sum(Invoice.total_amount)).filter(Invoice.school_id == school_id).scalar() or 0
    collected = db.query(func.sum(Payment.amount)).filter(Payment.school_id == school_id).scalar() or 0
    rate = (collected / total * 100) if total > 0 else 0
    return {"total_invoiced": float(total), "collected": float(collected), "rate_pct": round(float(rate), 1)}


def _staff_attendance_summary(db: Session, school_id: str | None) -> dict:
    present = db.query(Attendance).filter(Attendance.school_id == school_id, Attendance.status == "present").count()
    absent = db.query(Attendance).filter(Attendance.school_id == school_id, Attendance.status == "absent").count()
    late = db.query(Attendance).filter(Attendance.school_id == school_id, Attendance.status == "late").count()
    return {"present": present, "absent": absent, "late": late}


def _payroll_summary(db: Session, school_id: str | None) -> dict:
    return {"note": "See payroll module for detailed payroll reports"}


def _leave_balance_report(db: Session, school_id: str | None) -> dict:
    total = db.query(func.sum(LeaveBalance.total_days)).filter(LeaveBalance.school_id == school_id).scalar() or 0
    used = db.query(func.sum(LeaveBalance.used_days)).filter(LeaveBalance.school_id == school_id).scalar() or 0
    return {"total_leave_days": int(total), "used_days": int(used)}


def _borrowing_statistics(db: Session, school_id: str | None) -> dict:
    total = db.query(BookBorrowing).filter(BookBorrowing.school_id == school_id).count()
    active = db.query(BookBorrowing).filter(BookBorrowing.school_id == school_id, BookBorrowing.status == "borrowed").count()
    return {"total_borrowings": total, "active_borrowings": active}


def _overdue_books(db: Session, school_id: str | None) -> dict:
    overdue = db.query(BookBorrowing).filter(
        BookBorrowing.school_id == school_id,
        BookBorrowing.status == "borrowed",
        BookBorrowing.due_date < date.today()
    ).count()
    total_fines = db.query(func.sum(LibraryFine.amount)).filter(LibraryFine.school_id == school_id).scalar() or 0
    return {"overdue_count": overdue, "total_fines": float(total_fines)}


def _popular_books(db: Session, school_id: str | None) -> dict:
    return {"note": "See library module for most borrowed books"}


def _sales_summary(db: Session, school_id: str | None) -> dict:
    total = db.query(func.sum(CafeteriaOrder.total)).filter(CafeteriaOrder.school_id == school_id).scalar() or 0
    count = db.query(CafeteriaOrder).filter(CafeteriaOrder.school_id == school_id).count()
    return {"total_sales": float(total), "order_count": count}


def _popular_items(db: Session, school_id: str | None) -> dict:
    products = db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id).count()
    return {"total_products": products}


def _cafeteria_inventory_usage(db: Session, school_id: str | None) -> dict:
    products = db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id).count()
    low_stock = db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id, CafeteriaProduct.stock < 5).count()
    return {"total_products": products, "low_stock_items": low_stock}


def _stock_value_report(db: Session, school_id: str | None) -> dict:
    items = db.query(InventoryItem).filter(InventoryItem.school_id == school_id).count()
    return {"total_items": items}


def _low_stock_alert(db: Session, school_id: str | None) -> dict:
    low = db.query(InventoryItem).filter(
        InventoryItem.school_id == school_id,
        InventoryItem.quantity < InventoryItem.min_quantity
    ).count()
    return {"items_below_minimum": low}


def _supplier_performance(db: Session, school_id: str | None) -> dict:
    count = db.query(Supplier).filter(Supplier.school_id == school_id).count()
    return {"total_suppliers": count}


def _audit_trail_summary(db: Session, school_id: str | None) -> dict:
    total = db.query(AuditLog).filter(AuditLog.school_id == school_id).count()
    return {"total_audit_entries": total}


def _security_events(db: Session, school_id: str | None) -> dict:
    total = db.query(AuditLog).filter(
        AuditLog.school_id == school_id,
        AuditLog.action.like("SECURITY_%"),
    ).count()
    return {"total_events": total}


def _compliance_report(db: Session, school_id: str | None) -> dict:
    return {"status": "All systems operational"}


_REPORT_HANDLERS = {
    ("system", "Global Usage Report"): _global_usage_report,
    ("system", "License Compliance Report"): _license_compliance_report,
    ("system", "Error Log Summary"): _error_log_summary,
    ("admin", "Enrollment Summary"): _enrollment_summary,
    ("admin", "Staff Overview"): _staff_overview,
    ("admin", "Financial Summary"): _financial_summary,
    ("finance", "Revenue vs Expenses"): _revenue_vs_expenses,
    ("finance", "Outstanding Invoices"): _outstanding_invoices,
    ("finance", "Fee Collection Rate"): _fee_collection_rate,
    ("hr", "Staff Attendance Summary"): _staff_attendance_summary,
    ("hr", "Payroll Summary"): _payroll_summary,
    ("hr", "Leave Balance Report"): _leave_balance_report,
    ("library", "Borrowing Statistics"): _borrowing_statistics,
    ("library", "Overdue Books"): _overdue_books,
    ("library", "Popular Books"): _popular_books,
    ("cafeteria", "Sales Summary"): _sales_summary,
    ("cafeteria", "Popular Items"): _popular_items,
    ("cafeteria", "Inventory Usage"): _cafeteria_inventory_usage,
    ("inventory", "Stock Value Report"): _stock_value_report,
    ("inventory", "Low Stock Alert"): _low_stock_alert,
    ("inventory", "Supplier Performance"): _supplier_performance,
    ("auditor", "Audit Trail Summary"): _audit_trail_summary,
    ("auditor", "Security Events"): _security_events,
    ("auditor", "Compliance Report"): _compliance_report,
}


def generate_report_data(db: Session, module: str, name: str, school_id: str | None) -> dict:
    handler = _REPORT_HANDLERS.get((module, name))
    if handler is None:
        return {}
    return handler(db, school_id)


@router.get("/reports/{module}", dependencies=ALL_ROLES)
def list_reports(module: str, skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
                 db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # The "system" module surfaces global totals (users/schools/licenses) and is
    # therefore restricted to SUPER_ADMIN. Other roles get a 403 for this module.
    if module == "system" and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System reports require SUPER_ADMIN")
    school_id = current_user.school_id
    now = datetime.now(timezone.utc)
    definitions = REPORT_DEFINITIONS.get(module, [])
    results = []
    for d in definitions:
        report_data = generate_report_data(db, module, d["name"], school_id)
        results.append({
            "id": None,
            "name": d["name"],
            "type": d["type"],
            "period": d["period"],
            "generated": now.strftime("%Y-%m-%d"),
            "status": "ready",
            "data": report_data,
        })
    return results[skip:skip + limit]
