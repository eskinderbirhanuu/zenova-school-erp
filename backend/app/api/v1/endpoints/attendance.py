from datetime import date, datetime, time, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.school import School
from app.schemas.hr import AttendanceBulkItem, AttendanceBulkResponse, AttendanceResponse, AttendanceUpdate
from app.services.hr_service import get_attendance as hr_get_attendance
from app.services.notification_service import notify_parents_of_absence
from app.utils.excel import excel_response


ETHIOPIA_UTC_OFFSET = timedelta(hours=3)  # UTC+3


def _now_ethiopia() -> datetime:
    """Return current time in Ethiopian timezone (UTC+3)."""
    return datetime.now(timezone.utc) + ETHIOPIA_UTC_OFFSET


def _attendance_window_open() -> bool:
    """Check if current Ethiopian time is within the attendance window (2 ጠዋት–4 ጠዋት / 08:00–10:00)."""
    now = _now_ethiopia()
    return time(8, 0) <= now.time() <= time(10, 0)

router = APIRouter(tags=["attendance"])


@router.post("/attendance/bulk", response_model=AttendanceBulkResponse, status_code=status.HTTP_201_CREATED)
def mark_attendance_bulk(
    records: list[AttendanceBulkItem],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark attendance for multiple students/staff in bulk.
    Accessible by TEACHER, HR, ADMIN roles.
    Attendance window: 2 ጠዋት–4 ጠዋት (08:00–10:00 Ethiopian time / UTC+3)."""
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User has no school association")

    if not _attendance_window_open():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attendance can only be marked between 2 ጠዋት and 4 ጠዋት (08:00–10:00 Ethiopian time)",
        )

    created = 0
    errors = []

    # Pre-load the set of student_ids owned by this tenant so each record can be
    # validated without a per-row query, and so a caller cannot stamp attendance
    # onto another tenant's student (cross-tenant data pollution / existence leak).
    student_ids_in_batch = {r.student_id for r in records if r.student_id}
    valid_student_ids = set()
    if student_ids_in_batch:
        valid_student_ids = {
            s.id for s in db.query(Student.id).filter(
                Student.id.in_(student_ids_in_batch),
                Student.school_id == school_id,
            ).all()
        }

    for i, item in enumerate(records):
        # Tenant validation: reject records whose student_id doesn't belong to us.
        if item.student_id and item.student_id not in valid_student_ids:
            errors.append({"index": i, "reason": "Student not found in your school"})
            continue

        existing = db.query(Attendance).filter(
            Attendance.student_id == item.student_id,
            Attendance.date == item.date,
            Attendance.school_id == school_id,
        ).first()
        if existing:
            errors.append({"index": i, "reason": "Attendance already marked for this date"})
            continue

        att = Attendance(
            student_id=item.student_id,
            staff_profile_id=item.staff_profile_id,
            date=item.date,
            status=item.status,
            reason=item.reason,
            school_id=school_id,
            marked_by=current_user.id,
        )
        db.add(att)
        created += 1

    db.commit()

    absent_students = [r for r in records if r.status == "absent" and r.student_id]
    if absent_students:
        school = db.query(School).filter(School.id == school_id).first()
        school_name = school.name if school else "School"
        for item in absent_students:
            notify_parents_of_absence(
                db, item.student_id, str(item.date), school_id, school_name,
            )

    return AttendanceBulkResponse(created=created, errors=errors)


@router.get("/attendance", response_model=list[AttendanceResponse])
def query_attendance(
    date_filter: str | None = Query(None, alias="date"),
    student_id: str | None = Query(None),
    staff_profile_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List attendance records with optional filters.
    Accessible by TEACHER, HR, ADMIN, DIRECTOR roles."""
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User has no school association")

    q = db.query(Attendance).filter(Attendance.school_id == school_id)

    if date_filter:
        try:
            d = date.fromisoformat(date_filter)
            q = q.filter(Attendance.date == d)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format (use YYYY-MM-DD)")

    if student_id:
        q = q.filter(Attendance.student_id == student_id)
    if staff_profile_id:
        q = q.filter(Attendance.staff_profile_id == staff_profile_id)

    records = q.order_by(Attendance.date.desc(), Attendance.created_at.desc()).offset(skip).limit(limit).all()
    return [
        AttendanceResponse(
            id=r.id, staff_profile_id=r.staff_profile_id, student_id=r.student_id,
            date=r.date, check_in=r.check_in, check_out=r.check_out,
            status=r.status, reason=r.reason, school_id=r.school_id,
            marked_by=r.marked_by, created_at=r.created_at,
        )
        for r in records
    ]


@router.patch("/attendance/{attendance_id}", response_model=AttendanceResponse)
def patch_attendance(
    attendance_id: str,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an attendance record (status, reason, etc.).
    Attendance window: 2 ጠዋት–4 ጠዋት (08:00–10:00 Ethiopian time / UTC+3)."""
    if not _attendance_window_open():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attendance can only be modified between 2 ጠዋት and 4 ጠዋት (08:00–10:00 Ethiopian time)",
        )
    att = db.query(Attendance).filter(
        Attendance.id == attendance_id,
        Attendance.school_id == current_user.school_id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data:
        att.status = update_data["status"]
    if "reason" in update_data:
        att.reason = update_data["reason"]
    if "check_in" in update_data:
        att.check_in = update_data["check_in"]
    if "check_out" in update_data:
        att.check_out = update_data["check_out"]

    was_absent = att.status == "absent" and att.student_id

    db.commit()
    db.refresh(att)

    if was_absent:
        school = db.query(School).filter(School.id == current_user.school_id).first()
        school_name = school.name if school else "School"
        notify_parents_of_absence(db, att.student_id, str(att.date), current_user.school_id, school_name)

    return AttendanceResponse(
        id=att.id, staff_profile_id=att.staff_profile_id, student_id=att.student_id,
        date=att.date, check_in=att.check_in, check_out=att.check_out,
        status=att.status, reason=att.reason, school_id=att.school_id,
        marked_by=att.marked_by, created_at=att.created_at,
    )


@router.get("/attendance/export")
def export_attendance(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    school_id = current_user.school_id
    q = db.query(Attendance).filter(Attendance.school_id == school_id)
    if date_from:
        q = q.filter(Attendance.date >= date.fromisoformat(date_from))
    if date_to:
        q = q.filter(Attendance.date <= date.fromisoformat(date_to))
    if status_filter:
        q = q.filter(Attendance.status == status_filter)
    records = q.order_by(Attendance.date.desc()).all()

    # Batch-load student names to avoid N+1 queries
    student_ids = {r.student_id for r in records if r.student_id}
    students = db.query(Student).filter(Student.id.in_(student_ids)).all() if student_ids else []
    student_names = {s.id: f"{s.first_name} {s.last_name}" for s in students}

    headers = ["Date", "Student ID", "Student Name", "Status", "Reason", "Check In", "Check Out"]
    rows = []
    for r in records:
        name = student_names.get(r.student_id, "") if r.student_id else ""
        rows.append([str(r.date), r.student_id or "", name, r.status, r.reason or "", str(r.check_in or ""), str(r.check_out or "")])
    return excel_response(headers, rows, "attendance.xlsx")
