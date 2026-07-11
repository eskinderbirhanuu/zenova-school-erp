from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.parent import Parent
from app.models.parent_student_link import ParentStudentLink
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.class_ import ClassGrade
from app.models.exam import ExamResult, Exam
from app.models.invoice import Invoice
from app.models.subject import Subject
from app.models.payment import Payment
from app.schemas.finance import PaymentCreate
from app.services import finance_service
from datetime import datetime, timezone, date as date_type

router = APIRouter(tags=["parent-portal"])


@router.get("/parent-portal/dashboard")
def parent_portal_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.parent_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not linked to a parent profile")

    parent = db.query(Parent).filter(Parent.id == current_user.parent_id).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")

    links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_id == parent.id).all()
    student_ids = [l.student_id for l in links]

    if not student_ids:
        return {
            "parent": {"id": parent.id, "full_name": parent.full_name, "phone": parent.phone_1},
            "children": [],
        }

    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    student_map = {s.id: s for s in students}
    link_map = {l.student_id: l for l in links}

    class_ids = [s.class_id for s in students if s.class_id]
    class_map = {}
    if class_ids:
        for c in db.query(ClassGrade).filter(ClassGrade.id.in_(class_ids)).all():
            class_map[c.id] = c

    att_rows = db.query(Attendance.student_id, Attendance.status, func.count(Attendance.id)).filter(
        Attendance.student_id.in_(student_ids)
    ).group_by(Attendance.student_id, Attendance.status).all()
    att_by_student = {}
    for sid, status, cnt in att_rows:
        a = att_by_student.setdefault(sid, {})
        a[status] = cnt
        a["_total"] = a.get("_total", 0) + cnt

    exam_results = db.query(ExamResult, Exam, Subject).join(Exam, ExamResult.exam_id == Exam.id).join(Subject, Exam.subject_id == Subject.id).filter(
        ExamResult.student_id.in_(student_ids)
    ).all()
    grades_by_student = {}
    for er, ex, sub in exam_results:
        row = {
            "subject": sub.name,
            "exam": ex.name,
            "score": float(er.score) if er.score else 0,
            "grade": er.grade,
            "max_score": float(ex.max_score) if ex.max_score else 100,
        }
        grades_by_student.setdefault(er.student_id, []).append(row)

    invoices = db.query(Invoice).filter(
        Invoice.student_id.in_(student_ids)
    ).order_by(Invoice.due_date.desc()).all()
    fees_by_student = {}
    for inv in invoices:
        row = {
            "label": f"Invoice {inv.invoice_number}",
            "amount": str(inv.total_amount),
            "paid": str(inv.paid_amount),
            "due": inv.due_date.isoformat() if inv.due_date else None,
            "status": inv.status,
        }
        fees_by_student.setdefault(inv.student_id, []).append(row)

    children_data = []
    for sid in student_ids:
        student = student_map.get(sid)
        if not student:
            continue
        link = link_map.get(sid)
        parent_class = class_map.get(student.class_id) if student.class_id else None
        a = att_by_student.get(sid, {})
        total = a.get("_total", 0)
        present = a.get("present", 0)
        attendance_pct = round((present / total * 100)) if total > 0 else 0

        children_data.append({
            "id": student.id,
            "full_name": f"{student.first_name} {student.middle_name or ''} {student.last_name}",
            "student_id": student.student_id,
            "class_name": parent_class.name if parent_class else "—",
            "class_code": parent_class.code if parent_class else "—",
            "relationship": link.relationship if link else "—",
            "attendance_pct": attendance_pct,
            "photo_url": student.photo_url,
            "grades": grades_by_student.get(sid, [])[:20],
            "fees": fees_by_student.get(sid, [])[:10],
        })

    return {
        "parent": {
            "id": parent.id,
            "full_name": parent.full_name,
            "phone": parent.phone_1,
        },
        "children": children_data,
    }


def get_linked_student_ids(db: Session, current_user: User) -> list[str]:
    if not current_user.parent_id:
        raise HTTPException(status_code=400, detail="User is not linked to a parent profile")
    links = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == current_user.parent_id
    ).all()
    return [l.student_id for l in links]


@router.get("/parent-portal/invoices")
def parent_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student_ids = get_linked_student_ids(db, current_user)
    invoices = db.query(Invoice).filter(
        Invoice.student_id.in_(student_ids)
    ).order_by(Invoice.due_date.desc()).all()
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": inv.student_id,
            "total_amount": inv.total_amount,
            "paid_amount": inv.paid_amount,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "status": inv.status,
        }
        for inv in invoices
    ]


@router.post("/parent-portal/payments")
def parent_make_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student_ids = get_linked_student_ids(db, current_user)
    invoice = db.query(Invoice).filter(
        Invoice.id == data.invoice_id,
        Invoice.school_id == current_user.school_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.student_id not in student_ids:
        raise HTTPException(status_code=403, detail="Invoice does not belong to a linked student")
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already paid")

    if not data.idempotency_key:
        # Deterministic idempotency key per (parent, invoice) rounded to the
        # minute: two accidental double-clicks within ~60s collapse to ONE
        # payment instead of creating a duplicate. Genuine repeat payments must
        # supply an explicit idempotency_key.
        data.idempotency_key = f"parent:{current_user.id}:{invoice.id}:{int(datetime.now(timezone.utc).timestamp() // 60)}"
    payment = finance_service.record_payment(db, current_user.school_id, data, current_user.id)
    return {
        "id": payment.id,
        "payment_number": payment.payment_number,
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "status": "completed",
    }
