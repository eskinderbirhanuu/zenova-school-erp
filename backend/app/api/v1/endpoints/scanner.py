from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.services import qr_service, hr_service
from datetime import date as date_type
from pydantic import BaseModel

router = APIRouter(tags=["scanner"])


class ScanAttendanceRequest(BaseModel):
    qr_uuid: str
    date: date_type


class ScanAttendanceResponse(BaseModel):
    success: bool
    student_id: str | None = None
    student_name: str | None = None
    message: str


@router.post("/scanner/attendance", response_model=ScanAttendanceResponse)
def scan_qr_attendance(
    data: ScanAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    qr = qr_service.validate_qr(db, data.qr_uuid)
    if not qr["valid"]:
        raise HTTPException(status_code=400, detail=qr.get("message", "Invalid QR code"))
    if qr["reference_type"] != "student":
        raise HTTPException(status_code=400, detail="QR code is not associated with a student")
    student_id = qr["reference_id"]
    from app.models.student import Student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Student does not belong to this school")

    result = hr_service.bulk_mark_attendance(db, current_user.school_id, [
        {"student_id": student.id, "date": str(data.date), "status": "present"},
    ], current_user.id)

    if result["errors"]:
        return ScanAttendanceResponse(
            success=True,
            student_id=student.id,
            student_name=student.full_name,
            message="Already marked present",
        )

    return ScanAttendanceResponse(
        success=True,
        student_id=student.id,
        student_name=student.full_name,
        message="Attendance marked",
    )
