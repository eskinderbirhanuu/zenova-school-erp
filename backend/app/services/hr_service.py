from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.contract import EmployeeContract
from app.models.leave import LeaveType, LeaveRequest, LeaveBalance
from app.models.attendance import Attendance
from app.models.performance import PerformanceReview
from app.core.audit import log_audit


def create_contract(db: Session, data, user_id: str):
    c = EmployeeContract(
        staff_profile_id=data.staff_profile_id, contract_type=data.contract_type,
        start_date=data.start_date, end_date=data.end_date, position=data.position,
        department=data.department, basic_salary=data.basic_salary,
        notes=data.notes, created_by=user_id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    log_audit(db, user_id, "CONTRACT_CREATED", "employee_contract", c.id, f"Contract for staff {data.staff_profile_id}")
    return c


def get_contracts(db: Session, staff_profile_id: str = None):
    q = db.query(EmployeeContract)
    if staff_profile_id:
        q = q.filter(EmployeeContract.staff_profile_id == staff_profile_id)
    return q.order_by(EmployeeContract.created_at.desc()).all()


def terminate_contract(db: Session, contract_id: str, end_date: date, user_id: str):
    c = db.query(EmployeeContract).filter(EmployeeContract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    c.status = "terminated"
    c.end_date = end_date
    db.commit()
    log_audit(db, user_id, "CONTRACT_TERMINATED", "employee_contract", contract_id, "Contract terminated")
    return c


def create_leave_type(db: Session, school_id: str, data, user_id: str):
    lt = LeaveType(name=data.name, default_days=data.default_days, is_paid=data.is_paid, school_id=school_id)
    db.add(lt)
    db.commit()
    db.refresh(lt)
    log_audit(db, user_id, "LEAVE_TYPE_CREATED", "leave_type", lt.id, f"Leave type '{data.name}' created")
    return lt


def get_leave_types(db: Session, school_id: str):
    return db.query(LeaveType).filter(LeaveType.school_id == school_id).all()


def request_leave(db: Session, data, user_id: str):
    days = (data.end_date - data.start_date).days + 1
    bal = db.query(LeaveBalance).filter(
        LeaveBalance.staff_profile_id == data.staff_profile_id,
        LeaveBalance.leave_type_id == data.leave_type_id,
        LeaveBalance.year == data.start_date.year,
    ).first()
    if bal and days > bal.remaining_days:
        raise HTTPException(status_code=400, detail=f"Insufficient leave balance. Only {bal.remaining_days} days remaining.")
    lr = LeaveRequest(
        staff_profile_id=data.staff_profile_id, leave_type_id=data.leave_type_id,
        start_date=data.start_date, end_date=data.end_date, days=days, reason=data.reason,
    )
    db.add(lr)
    db.commit()
    db.refresh(lr)
    log_audit(db, user_id, "LEAVE_REQUESTED", "leave_request", lr.id, f"Leave requested for {days} days")
    return lr


def approve_leave(db: Session, request_id: str, user_id: str):
    lr = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    lr.status = "approved"
    lr.approved_by = user_id
    bal = db.query(LeaveBalance).filter(
        LeaveBalance.staff_profile_id == lr.staff_profile_id,
        LeaveBalance.leave_type_id == lr.leave_type_id,
        LeaveBalance.year == lr.start_date.year,
    ).first()
    if bal:
        bal.used_days += lr.days
        bal.remaining_days = bal.total_days - bal.used_days
    db.commit()
    log_audit(db, user_id, "LEAVE_APPROVED", "leave_request", request_id, "Leave approved")
    return lr


def reject_leave(db: Session, request_id: str, user_id: str):
    lr = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    lr.status = "rejected"
    lr.approved_by = user_id
    db.commit()
    log_audit(db, user_id, "LEAVE_REJECTED", "leave_request", request_id, "Leave rejected")
    return lr


def get_leave_requests(db: Session, staff_profile_id: str = None, status: str = None):
    q = db.query(LeaveRequest)
    if staff_profile_id:
        q = q.filter(LeaveRequest.staff_profile_id == staff_profile_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    return q.order_by(LeaveRequest.created_at.desc()).all()


def init_leave_balance(db: Session, staff_profile_id: str, leave_type_id: str, year: int, total_days: int):
    bal = LeaveBalance(
        staff_profile_id=staff_profile_id, leave_type_id=leave_type_id,
        year=year, total_days=total_days, remaining_days=total_days,
    )
    db.add(bal)
    db.commit()
    db.refresh(bal)
    return bal


def get_leave_balances(db: Session, staff_profile_id: str, year: int = None):
    q = db.query(LeaveBalance).filter(LeaveBalance.staff_profile_id == staff_profile_id)
    if year:
        q = q.filter(LeaveBalance.year == year)
    return q.all()


def mark_attendance(db: Session, school_id: str, data, user_id: str):
    existing = db.query(Attendance).filter(
        Attendance.staff_profile_id == data.staff_profile_id,
        Attendance.student_id == data.student_id,
        Attendance.date == data.date,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this date")
    a = Attendance(
        staff_profile_id=data.staff_profile_id, student_id=data.student_id,
        date=data.date, check_in=data.check_in, check_out=data.check_out,
        status=data.status, reason=getattr(data, 'reason', None),
        school_id=school_id, marked_by=user_id,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def bulk_mark_attendance(db: Session, school_id: str, records: list, user_id: str):
    created = []
    errors = []
    for i, data in enumerate(records):
        existing = db.query(Attendance).filter(
            Attendance.staff_profile_id == data.get("staff_profile_id"),
            Attendance.student_id == data.get("student_id"),
            Attendance.date == data.get("date"),
        ).first()
        if existing:
            errors.append({"index": i, "reason": "Duplicate entry for this date"})
            continue
        a = Attendance(
            staff_profile_id=data.get("staff_profile_id"),
            student_id=data.get("student_id"),
            date=data.get("date"),
            status=data.get("status", "present"),
            reason=data.get("reason"),
            school_id=school_id, marked_by=user_id,
        )
        db.add(a)
        created.append(a)
    db.commit()
    for a in created:
        db.refresh(a)
    return {"created": len(created), "errors": errors}
    a = Attendance(
        staff_profile_id=data.staff_profile_id, student_id=data.student_id,
        date=data.date, check_in=data.check_in, check_out=data.check_out,
        status=data.status, school_id=school_id, marked_by=user_id,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    log_audit(db, user_id, "ATTENDANCE_MARKED", "attendance", a.id, f"Attendance for {data.date}")
    return a


def update_attendance(db: Session, attendance_id: str, data, user_id: str):
    a = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if data.check_in is not None:
        a.check_in = data.check_in
    if data.check_out is not None:
        a.check_out = data.check_out
    if data.status is not None:
        a.status = data.status
    if hasattr(data, 'reason') and data.reason is not None:
        a.reason = data.reason
    db.commit()
    log_audit(db, user_id, "ATTENDANCE_UPDATED", "attendance", attendance_id, "Attendance updated")
    return a


def get_attendance(db: Session, school_id: str, date_filter: date = None, staff_id: str = None):
    q = db.query(Attendance).filter(Attendance.school_id == school_id)
    if date_filter:
        q = q.filter(Attendance.date == date_filter)
    if staff_id:
        q = q.filter(Attendance.staff_profile_id == staff_id)
    return q.order_by(Attendance.date.desc()).all()


def create_performance_review(db: Session, data, user_id: str):
    pr = PerformanceReview(
        staff_profile_id=data.staff_profile_id, reviewer_id=user_id,
        period=data.period, rating=data.rating, comments=data.comments,
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)
    log_audit(db, user_id, "PERFORMANCE_REVIEW_CREATED", "performance_review", pr.id, f"Review for staff {data.staff_profile_id}")
    return pr


def get_performance_reviews(db: Session, staff_profile_id: str = None):
    q = db.query(PerformanceReview)
    if staff_profile_id:
        q = q.filter(PerformanceReview.staff_profile_id == staff_profile_id)
    return q.order_by(PerformanceReview.created_at.desc()).all()
