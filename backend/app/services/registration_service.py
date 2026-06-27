from datetime import date
from sqlalchemy.orm import Session
from app.services import student_service, parent_service, qr_service, id_service
from app.core.audit import log_audit


class RegistrationResult:
    def __init__(self):
        self.student = None
        self.parents = []
        self.qr_code = None
        self.nfc_card = None


def register_student(
    db: Session,
    first_name: str,
    middle_name: str,
    last_name: str,
    gender: str,
    date_of_birth: date,
    admission_date: date | None = None,
    grade_id: str | None = None,
    section_id: str | None = None,
    academic_year_id: str | None = None,
    address: str | None = None,
    nationality: str | None = None,
    blood_group: str | None = None,
    photo_url: str | None = None,
    emergency_contact: str | None = None,
    school_id: str | None = None,
    branch_id: str | None = None,
    registered_by: str | None = None,
    parents_data: list[dict] | None = None,
) -> RegistrationResult:
    """Full student registration: student + parent(s) + QR + audit"""
    result = RegistrationResult()

    # 1. Generate student ID
    student_id = id_service.generate_id(db, "student", school_id)

    # 2. Create student
    student = student_service.create_student(
        db=db,
        student_id=student_id,
        first_name=first_name,
        middle_name=middle_name,
        last_name=last_name,
        gender=gender,
        date_of_birth=date_of_birth,
        admission_date=admission_date,
        grade_id=grade_id,
        section_id=section_id,
        academic_year_id=academic_year_id,
        address=address,
        nationality=nationality,
        blood_group=blood_group,
        photo_url=photo_url,
        emergency_contact=emergency_contact,
        school_id=school_id,
        branch_id=branch_id,
        registered_by=registered_by,
    )
    result.student = student

    # 3. Handle parents
    if parents_data:
        for pdata in parents_data:
            parent = _handle_parent(
                db=db,
                parent_data=pdata,
                student_id=student.id,
                school_id=school_id,
            )
            result.parents.append(parent)

    # 4. Generate QR code
    qr = qr_service.generate_qr(
        db=db,
        reference_type="student",
        reference_id=student.id,
        school_id=school_id,
        branch_id=branch_id,
    )
    result.qr_code = qr

    return result


def _handle_parent(
    db: Session,
    parent_data: dict,
    student_id: str,
    school_id: str | None = None,
):
    """Smart parent linking: search first, create if not found"""
    query = parent_data.get("phone_1", "") or parent_data.get("phone_2", "") or parent_data.get("national_id", "")
    if query:
        existing = parent_service.smart_search_parents(db, query, school_id)
        if existing:
            parent = existing[0]
            parent_service.link_parent_to_student(
                db=db,
                parent_id=parent.id,
                student_id=student_id,
                relationship=parent_data.get("relationship"),
                is_primary=parent_data.get("is_primary", False),
            )
            return parent

    parent_id = id_service.generate_id(db, "parent", school_id) if school_id else None
    parent = parent_service.create_parent(
        db=db,
        parent_id=parent_id,
        full_name=parent_data["full_name"],
        phone_1=parent_data["phone_1"],
        relationship=parent_data.get("relationship"),
        phone_2=parent_data.get("phone_2"),
        occupation=parent_data.get("occupation"),
        address=parent_data.get("address"),
        national_id=parent_data.get("national_id"),
        passport_id=parent_data.get("passport_id"),
        kebele_id=parent_data.get("kebele_id"),
        photo_url=parent_data.get("photo_url"),
        school_id=school_id,
    )

    parent_service.link_parent_to_student(
        db=db,
        parent_id=parent.id,
        student_id=student_id,
        relationship=parent_data.get("relationship"),
        is_primary=parent_data.get("is_primary", False),
    )

    return parent
