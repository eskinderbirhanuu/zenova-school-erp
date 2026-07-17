from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.student_card import StudentCard
from app.models.staff_card import StaffCard
from app.models.parent_card import ParentCard
from app.models.employee_card import EmployeeCard
from app.models.nfc_scan_log import NfcScanLog
from app.models.card_print_request import CardPrintRequest
from app.models.student import Student
from app.models.staff_profile import StaffProfile
from app.models.parent import Parent
from app.models.user import User
from app.core.audit import log_audit
from app.core.exceptions import ConflictException
from app.core.error_codes import ErrorCode
from app.utils.uid_hash import hash_card_uid

_ALL_CARD_MODELS = [StudentCard, StaffCard, ParentCard, EmployeeCard]


def _ensure_unique_card_uid(db: Session, uid_hash: str) -> None:
    for model in _ALL_CARD_MODELS:
        if db.query(model).filter(model.card_uid == uid_hash).first():
            raise ConflictException("NFC card UID is already assigned to another card", code=ErrorCode.CONFLICT_GENERIC)


def assign_student_card(
    db: Session,
    student_id: str,
    card_uid: str,
    assigned_by: str | None = None,
    card_tier: str = "standard",
) -> StudentCard:
    uid_hash = hash_card_uid(card_uid)
    existing = db.query(StudentCard).filter(StudentCard.card_uid == uid_hash).first()
    if existing:
        raise ConflictException("NFC card UID already assigned to a student", code=ErrorCode.CONFLICT_GENERIC)
    _ensure_unique_card_uid(db, uid_hash)
    _school_id = db.query(Student.school_id).filter(Student.id == student_id).scalar()
    card = StudentCard(student_id=student_id, school_id=_school_id, card_uid=uid_hash, card_tier=card_tier)
    db.add(card)
    log_audit(
        db=db, user_id=assigned_by or "system",
        table_name="student_cards", record_id=card.id,
        action="NFC_STUDENT_CARD_ASSIGNED",
        new_data={"student_id": student_id, "card_uid": card_uid},
        school_id=_school_id,
    )
    db.commit()
    db.refresh(card)
    return card


def assign_staff_card(
    db: Session,
    staff_profile_id: str,
    card_uid: str,
    assigned_by: str | None = None,
    card_tier: str = "standard",
) -> StaffCard:
    uid_hash = hash_card_uid(card_uid)
    existing = db.query(StaffCard).filter(StaffCard.card_uid == uid_hash).first()
    if existing:
        raise ConflictException("NFC card UID already assigned to a staff member", code=ErrorCode.CONFLICT_GENERIC)
    _ensure_unique_card_uid(db, uid_hash)
    _school_id = db.query(StaffProfile.school_id).filter(StaffProfile.id == staff_profile_id).scalar()
    card = StaffCard(staff_profile_id=staff_profile_id, school_id=_school_id, card_uid=uid_hash, card_tier=card_tier)
    db.add(card)
    log_audit(
        db=db, user_id=assigned_by or "system",
        table_name="staff_cards", record_id=card.id,
        action="NFC_STAFF_CARD_ASSIGNED",
        new_data={"staff_profile_id": staff_profile_id, "card_uid": card_uid},
        school_id=_school_id,
    )
    db.commit()
    db.refresh(card)
    return card


def assign_parent_card(
    db: Session,
    parent_id: str,
    card_uid: str,
    assigned_by: str | None = None,
    card_tier: str = "standard",
) -> ParentCard:
    uid_hash = hash_card_uid(card_uid)
    existing = db.query(ParentCard).filter(ParentCard.card_uid == uid_hash).first()
    if existing:
        raise ConflictException("NFC card UID already assigned to a parent", code=ErrorCode.CONFLICT_GENERIC)
    _ensure_unique_card_uid(db, uid_hash)
    _school_id = db.query(Parent.school_id).filter(Parent.id == parent_id).scalar()
    card = ParentCard(parent_id=parent_id, school_id=_school_id, card_uid=uid_hash, card_tier=card_tier)
    db.add(card)
    log_audit(
        db=db, user_id=assigned_by or "system",
        table_name="parent_cards", record_id=card.id,
        action="NFC_PARENT_CARD_ASSIGNED",
        new_data={"parent_id": parent_id, "card_uid": card_uid},
        school_id=_school_id,
    )
    db.commit()
    db.refresh(card)
    return card


def assign_employee_card(
    db: Session,
    employee_id: str,
    card_uid: str,
    assigned_by: str | None = None,
    card_tier: str = "standard",
) -> EmployeeCard:
    uid_hash = hash_card_uid(card_uid)
    existing = db.query(EmployeeCard).filter(EmployeeCard.card_uid == uid_hash).first()
    if existing:
        raise ConflictException("NFC card UID already assigned to a corporate employee", code=ErrorCode.CONFLICT_GENERIC)
    _ensure_unique_card_uid(db, uid_hash)
    card = EmployeeCard(employee_id=employee_id, card_uid=uid_hash, card_tier=card_tier)
    db.add(card)
    log_audit(
        db=db, user_id=assigned_by or "system",
        table_name="employee_cards", record_id=card.id,
        action="NFC_EMPLOYEE_CARD_ASSIGNED",
        new_data={"employee_id": employee_id, "card_uid": card_uid},
    )
    db.commit()
    db.refresh(card)
    return card


def scan_nfc(
    db: Session,
    card_uid: str,
    scan_type: str = "verification",
    reader_location: str | None = None,
) -> dict:
    uid_hash = hash_card_uid(card_uid)
    nfcs = [
        ("student", db.query(StudentCard).filter(StudentCard.card_uid == uid_hash).first()),
        ("staff", db.query(StaffCard).filter(StaffCard.card_uid == uid_hash).first()),
        ("parent", db.query(ParentCard).filter(ParentCard.card_uid == uid_hash).first()),
        ("employee", db.query(EmployeeCard).filter(EmployeeCard.card_uid == uid_hash).first()),
    ]

    ref_type = None
    ref_id = None
    card = None
    for rtype, c in nfcs:
        if c:
            ref_type = rtype
            ref_id = c.student_id if rtype == "student" else (
                c.staff_profile_id if rtype == "staff" else (
                    c.parent_id if rtype == "parent" else c.employee_id
                )
            )
            card = c
            break

    if not card or card.status != "active":
        return {"success": False, "card_uid": uid_hash, "reference_type": "", "reference_id": "", "person_name": None, "photo_url": None, "message": "Card not found or inactive"}

    if card.expiry_date and card.expiry_date < datetime.now(timezone.utc):
        return {"success": False, "card_uid": uid_hash, "reference_type": ref_type, "reference_id": ref_id, "person_name": None, "photo_url": None, "message": "Card has expired"}

    person_name = None
    photo_url = None
    if ref_type == "student":
        s = db.query(Student).filter(Student.id == ref_id).first()
        if s:
            person_name = " ".join(filter(None, [s.first_name, s.middle_name, s.last_name]))
            photo_url = s.photo_url
    elif ref_type == "staff":
        sp = db.query(StaffProfile).filter(StaffProfile.id == ref_id).first()
        if sp:
            u = db.query(User).filter(User.id == sp.user_id).first()
            if u:
                person_name = u.full_name
                photo_url = u.photo_url
    elif ref_type == "parent":
        p = db.query(Parent).filter(Parent.id == ref_id).first()
        if p:
            person_name = p.full_name
            photo_url = p.photo_url
    elif ref_type == "employee":
        from app.models.corporate_employee import CorporateEmployee
        ce = db.query(CorporateEmployee).filter(CorporateEmployee.id == ref_id).first()
        if ce:
            person_name = ce.full_name
            photo_url = ce.photo_url

    scan = NfcScanLog(
        card_uid=uid_hash,
        reference_type=ref_type,
        reference_id=ref_id,
        scan_type=scan_type,
        reader_location=reader_location,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Broadcast scan event (safe for both sync and async contexts)
    try:
        from app.services.scan_event_manager import scan_event_manager
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(scan_event_manager.broadcast("nfc-scans", {
                "event": "nfc_scan",
                "card_uid": uid_hash,
                "reference_type": ref_type,
                "reference_id": ref_id,
                "scan_type": scan_type,
                "reader_location": reader_location,
                "person_name": person_name,
                "scanned_at": str(scan.scanned_at),
            }))
        except RuntimeError:
            # No running event loop (sync context) — skip broadcast
            pass
    except Exception:
        pass

    return {
        "success": True,
        "card_uid": uid_hash,
        "reference_type": ref_type,
        "reference_id": ref_id,
        "person_name": person_name,
        "photo_url": photo_url,
        "message": f"{scan_type} scan successful",
    }


def get_student_by_card(db: Session, card_uid: str, school_id: str | None = None) -> Student | None:
    card = db.query(StudentCard).filter(StudentCard.card_uid == hash_card_uid(card_uid)).first()
    if not card:
        return None
    q = db.query(Student).filter(Student.id == card.student_id)
    if school_id is not None:
        q = q.filter(Student.school_id == school_id)
    return q.first()


def get_staff_by_card(db: Session, card_uid: str, school_id: str | None = None) -> dict | None:
    card = db.query(StaffCard).filter(StaffCard.card_uid == hash_card_uid(card_uid)).first()
    if not card:
        return None
    q = db.query(StaffProfile).filter(StaffProfile.id == card.staff_profile_id)
    if school_id is not None:
        q = q.filter(StaffProfile.school_id == school_id)
    sp = q.first()
    if not sp:
        return None
    u = db.query(User).filter(User.id == sp.user_id).first()
    return {"staff_profile": sp, "user": u}


def get_parent_by_card(db: Session, card_uid: str, school_id: str | None = None) -> Parent | None:
    card = db.query(ParentCard).filter(ParentCard.card_uid == hash_card_uid(card_uid)).first()
    if not card:
        return None
    q = db.query(Parent).filter(Parent.id == card.parent_id)
    if school_id is not None:
        q = q.filter(Parent.school_id == school_id)
    return q.first()


def get_employee_by_card(db: Session, card_uid: str, school_id: str | None = None) -> dict | None:
    card = db.query(EmployeeCard).filter(EmployeeCard.card_uid == hash_card_uid(card_uid)).first()
    if not card:
        return None
    q = db.query(CorporateEmployee).filter(CorporateEmployee.id == card.employee_id)
    if school_id is not None:
        q = q.filter(CorporateEmployee.school_id == school_id)
    ce = q.first()
    return {"employee": ce} if ce else None


def update_card_status(
    db: Session,
    card_type: str,
    card_id: str,
    status: str,
    user_id: str | None = None,
) -> bool:
    model_map = {
        "student": StudentCard,
        "staff": StaffCard,
        "parent": ParentCard,
        "employee": EmployeeCard,
    }
    model = model_map.get(card_type)
    if not model:
        return False
    card = db.query(model).filter(model.id == card_id).first()
    if not card:
        return False
    old_status = card.status
    card.status = status
    _school_id = None
    if card_type == "student":
        s = db.query(Student).filter(Student.id == card.student_id).first()
        _school_id = s.school_id if s else None
    elif card_type == "staff":
        sp = db.query(StaffProfile).filter(StaffProfile.id == card.staff_profile_id).first()
        _school_id = sp.school_id if sp else None
    elif card_type == "parent":
        p = db.query(Parent).filter(Parent.id == card.parent_id).first()
        _school_id = p.school_id if p else None
    log_audit(
        db=db, user_id=user_id or "system",
        table_name=f"{card_type}_cards", record_id=card.id,
        action="NFC_CARD_STATUS_CHANGED",
        old_data={"status": old_status},
        new_data={"status": status},
        school_id=_school_id,
    )
    db.commit()
    return True


def request_card_print(
    db: Session,
    card_type: str,
    reference_id: str,
    requested_by: str | None = None,
    notes: str | None = None,
    school_id: str | None = None,
) -> CardPrintRequest:
    req = CardPrintRequest(
        card_type=card_type,
        reference_id=reference_id,
        requested_by=requested_by,
        notes=notes,
        school_id=school_id,
    )
    db.add(req)
    log_audit(
        db=db, user_id=requested_by or "system",
        table_name="card_print_requests", record_id=req.id,
        action="CARD_PRINT_REQUESTED",
        new_data={"card_type": card_type, "reference_id": reference_id},
        school_id=school_id,
    )
    db.commit()
    db.refresh(req)
    return req


def process_print_request(
    db: Session,
    request_id: str,
    user_id: str,
    action: str = "approve",
) -> CardPrintRequest | None:
    req = db.query(CardPrintRequest).filter(CardPrintRequest.id == request_id).first()
    if not req:
        return None
    old_status = req.status
    if action == "approve":
        req.status = "approved"
        req.approved_by = user_id
    elif action == "print":
        req.status = "printed"
        req.printed_by = user_id
    elif action == "reject":
        req.status = "rejected"
    log_audit(
        db=db, user_id=user_id or "system",
        table_name="card_print_requests", record_id=req.id,
        action=f"CARD_PRINT_{action.upper()}",
        old_data={"status": old_status},
        new_data={"status": req.status},
        school_id=req.school_id,
    )
    db.commit()
    db.refresh(req)
    return req


def bulk_assign_cards(
    db: Session,
    items: list[dict],
    assigned_by: str | None = None,
) -> dict:
    assign_map = {
        "student": assign_student_card,
        "staff": assign_staff_card,
        "parent": assign_parent_card,
        "employee": assign_employee_card,
    }
    success_count = 0
    errors = []
    for i, item in enumerate(items):
        fn = assign_map.get(item.get("card_type", ""))
        if not fn:
            errors.append({"row": i, "reason": "Invalid card_type"})
            continue
        try:
            fn(db, item["reference_id"], item["card_uid"], assigned_by, item.get("card_tier", "standard"))
            success_count += 1
        except ConflictException as e:
            errors.append({"row": i, "reason": str(e)})
        except Exception as e:
            errors.append({"row": i, "reason": str(e)})
    return {"success_count": success_count, "failure_count": len(errors), "errors": errors}


def _school_lookup(db: Session, card_uid: str) -> str | None:
    """Trace card → person → school. Returns school name + contact message, or None."""
    from app.models.school import School
    uid_hash = hash_card_uid(card_uid)

    card = db.query(StudentCard).filter(StudentCard.card_uid == uid_hash).first()
    if card:
        student = db.query(Student).filter(Student.id == card.student_id).first()
        if student and student.school_id:
            school = db.query(School).filter(School.id == student.school_id).first()
            if school:
                contact = school.email or school.phone or "support@zenova.com"
                return f"This card belongs to {school.name}. If found, please contact {contact}."

    card = db.query(StaffCard).filter(StaffCard.card_uid == uid_hash).first()
    if card:
        sp = db.query(StaffProfile).filter(StaffProfile.id == card.staff_profile_id).first()
        if sp and sp.school_id:
            school = db.query(School).filter(School.id == sp.school_id).first()
            if school:
                contact = school.email or school.phone or "support@zenova.com"
                return f"This card belongs to {school.name}. If found, please contact {contact}."

    card = db.query(ParentCard).filter(ParentCard.card_uid == uid_hash).first()
    if card:
        parent = db.query(Parent).filter(Parent.id == card.parent_id).first()
        if parent and parent.school_id:
            school = db.query(School).filter(School.id == parent.school_id).first()
            if school:
                contact = school.email or school.phone or "support@zenova.com"
                return f"This card belongs to {school.name}. If found, please contact {contact}."

    return None


def public_lookup_card(db: Session, card_uid: str) -> dict:
    """Public endpoint — no auth required. Returns contact information for a
    found card if recognised. NEVER returns any personally identifiable
    information about the card holder. Response does NOT reveal whether the
    card UID exists in the system (anti-enumeration)."""
    uid_hash = hash_card_uid(card_uid)
    for model in (StudentCard, StaffCard, ParentCard, EmployeeCard):
        if db.query(model).filter(model.card_uid == uid_hash).first():
            school_msg = _school_lookup(db, card_uid)
            if school_msg:
                message = school_msg
            else:
                message = "If found, please contact support@zenova.com or call +251-911-000000."
            return {"card_uid": uid_hash, "message": message}
    return {"card_uid": uid_hash, "message": "If found, please contact support@zenova.com or call +251-911-000000."}


def list_scan_logs(
    db: Session,
    school_id: str | None = None,
    limit: int = 100,
) -> list[NfcScanLog]:
    q = db.query(NfcScanLog)
    if school_id:
        q = q.filter(NfcScanLog.school_id == school_id)
    return q.order_by(NfcScanLog.scanned_at.desc()).limit(limit).all()


def list_print_requests(
    db: Session,
    status: str | None = None,
    school_id: str | None = None,
    limit: int = 100,
) -> list[CardPrintRequest]:
    q = db.query(CardPrintRequest)
    if status:
        q = q.filter(CardPrintRequest.status == status)
    if school_id:
        q = q.filter(CardPrintRequest.school_id == school_id)
    return q.order_by(CardPrintRequest.created_at.desc()).limit(limit).all()
