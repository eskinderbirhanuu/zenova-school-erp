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
from datetime import datetime, timezone
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


def generate_report_data(db: Session, module: str, name: str, school_id: str | None) -> dict:
    data = {}
    if module == "system" and name == "Global Usage Report":
        data = {
            "total_users": db.query(User).count(),
            "total_schools": db.query(func.distinct(User.school_id)).scalar() or 0,
            "total_students": db.query(Student).count(),
        }
    elif module == "system" and name == "License Compliance Report":
        active = db.query(License).filter(License.status == "ACTIVE").count()
        expired = db.query(License).filter(License.status == "EXPIRED").count()
        data = {"active_licenses": active, "expired_licenses": expired}
    elif module == "system" and name == "Error Log Summary":
        data = {"total_audit_entries": db.query(AuditLog).count()}
    elif module == "admin" and name == "Enrollment Summary":
        total = db.query(Student).filter(Student.school_id == school_id).count()
        active = db.query(Student).filter(Student.school_id == school_id, Student.status == "active").count()
        data = {"total_students": total, "active_students": active}
    elif module == "admin" and name == "Staff Overview":
        staff_count = db.query(StaffProfile).filter(StaffProfile.school_id == school_id).count()
        teacher_count = db.query(TeacherProfile).filter(TeacherProfile.school_id == school_id).count()
        data = {"staff": staff_count, "teachers": teacher_count}
    elif module == "admin" and name == "Financial Summary":
        total_invoiced = db.query(func.sum(Invoice.total_amount)).filter(Invoice.school_id == school_id).scalar() or 0
        total_collected = db.query(func.sum(Payment.amount)).filter(Payment.school_id == school_id).scalar() or 0
        data = {"total_invoiced": float(total_invoiced), "total_collected": float(total_collected)}
    elif module == "finance" and name == "Revenue vs Expenses":
        total_payments = db.query(func.sum(Payment.amount)).filter(Payment.school_id == school_id).scalar() or 0
        data = {"revenue": float(total_payments)}
    elif module == "finance" and name == "Outstanding Invoices":
        total = db.query(func.sum(Invoice.total_amount - Invoice.paid_amount)).filter(
            Invoice.school_id == school_id, Invoice.status.in_(["draft", "sent"])).scalar() or 0
        count = db.query(Invoice).filter(Invoice.school_id == school_id, Invoice.status.in_(["draft", "sent"])).count()
        data = {"outstanding_amount": float(total), "outstanding_count": count}
    elif module == "finance" and name == "Fee Collection Rate":
        total = db.query(func.sum(Invoice.total_amount)).filter(Invoice.school_id == school_id).scalar() or 0
        collected = db.query(func.sum(Payment.amount)).filter(Payment.school_id == school_id).scalar() or 0
        rate = (collected / total * 100) if total > 0 else 0
        data = {"total_invoiced": float(total), "collected": float(collected), "rate_pct": round(float(rate), 1)}
    elif module == "hr" and name == "Staff Attendance Summary":
        present = db.query(Attendance).filter(Attendance.school_id == school_id, Attendance.status == "present").count()
        absent = db.query(Attendance).filter(Attendance.school_id == school_id, Attendance.status == "absent").count()
        late = db.query(Attendance).filter(Attendance.school_id == school_id, Attendance.status == "late").count()
        data = {"present": present, "absent": absent, "late": late}
    elif module == "hr" and name == "Payroll Summary":
        data = {"note": "See payroll module for detailed payroll reports"}
    elif module == "hr" and name == "Leave Balance Report":
        total = db.query(func.sum(LeaveBalance.total_days)).filter(LeaveBalance.school_id == school_id).scalar() or 0
        used = db.query(func.sum(LeaveBalance.used_days)).filter(LeaveBalance.school_id == school_id).scalar() or 0
        data = {"total_leave_days": int(total), "used_days": int(used)}
    elif module == "library" and name == "Borrowing Statistics":
        total = db.query(BookBorrowing).filter(BookBorrowing.school_id == school_id).count()
        active = db.query(BookBorrowing).filter(BookBorrowing.school_id == school_id, BookBorrowing.status == "borrowed").count()
        data = {"total_borrowings": total, "active_borrowings": active}
    elif module == "library" and name == "Overdue Books":
        from datetime import date
        overdue = db.query(BookBorrowing).filter(
            BookBorrowing.school_id == school_id,
            BookBorrowing.status == "borrowed",
            BookBorrowing.due_date < date.today()
        ).count()
        total_fines = db.query(func.sum(LibraryFine.amount)).filter(LibraryFine.school_id == school_id).scalar() or 0
        data = {"overdue_count": overdue, "total_fines": float(total_fines)}
    elif module == "library" and name == "Popular Books":
        data = {"note": "See library module for most borrowed books"}
    elif module == "cafeteria" and name == "Sales Summary":
        total = db.query(func.sum(CafeteriaOrder.total)).filter(CafeteriaOrder.school_id == school_id).scalar() or 0
        count = db.query(CafeteriaOrder).filter(CafeteriaOrder.school_id == school_id).count()
        data = {"total_sales": float(total), "order_count": count}
    elif module == "cafeteria" and name == "Popular Items":
        products = db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id).count()
        data = {"total_products": products}
    elif module == "cafeteria" and name == "Inventory Usage":
        products = db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id).count()
        low_stock = db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id, CafeteriaProduct.stock < 5).count()
        data = {"total_products": products, "low_stock_items": low_stock}
    elif module == "inventory" and name == "Stock Value Report":
        items = db.query(InventoryItem).filter(InventoryItem.school_id == school_id).count()
        data = {"total_items": items}
    elif module == "inventory" and name == "Low Stock Alert":
        low = db.query(InventoryItem).filter(
            InventoryItem.school_id == school_id,
            InventoryItem.quantity < InventoryItem.min_quantity
        ).count()
        data = {"items_below_minimum": low}
    elif module == "inventory" and name == "Supplier Performance":
        count = db.query(Supplier).filter(Supplier.school_id == school_id).count()
        data = {"total_suppliers": count}
    elif module == "auditor" and name == "Audit Trail Summary":
        total = db.query(AuditLog).filter(AuditLog.school_id == school_id).count()
        data = {"total_audit_entries": total}
    elif module == "auditor" and name == "Security Events":
        # SECURITY_* events for this tenant only; superuser sees all via the system module.
        total = db.query(AuditLog).filter(
            AuditLog.school_id == school_id,
            AuditLog.action.like("SECURITY_%"),
        ).count()
        data = {"total_events": total}
    elif module == "auditor" and name == "Compliance Report":
        data = {"status": "All systems operational"}
    return data


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
