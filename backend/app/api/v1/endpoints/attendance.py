from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.attendance import Attendance
from app.models.school import School
from app.schemas.hr import AttendanceBulkItem, AttendanceBulkResponse, AttendanceResponse
from app.services.hr_service import get_attendance as hr_get_attendance
from app.services.notification_service import notify_parents_of_absence

router = APIRouter(tags=["attendance"])


@router.post("/attendance/bulk", response_model=AttendanceBulkResponse, status_code=status.HTTP_201_CREATED)
def mark_attendance_bulk(
    records: list[AttendanceBulkItem],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark attendance for multiple students/staff in bulk.
    Accessible by TEACHER, HR, ADMIN roles."""
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User has no school association")

    created = 0
    errors = []

    for i, item in enumerate(records):
        existing = db.query(Attendance).filter(
            Attendance.student_id == item.student_id,
            Attendance.date == item.date,
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

    records = q.order_by(Attendance.date.desc(), Attendance.created_at.desc()).all()
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
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an attendance record (status, reason, etc.)."""
    att = db.query(Attendance).filter(
        Attendance.id == attendance_id,
        Attendance.school_id == current_user.school_id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    if "status" in data:
        att.status = data["status"]
    if "reason" in data:
        att.reason = data["reason"]
    if "check_in" in data:
        att.check_in = data["check_in"]
    if "check_out" in data:
        att.check_out = data["check_out"]

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
