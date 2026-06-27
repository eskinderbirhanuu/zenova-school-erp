from datetime import date, datetime
from sqlalchemy.orm import Session
from app.models.student import Student
from app.core.audit import log_audit


def create_student(
    db: Session,
    student_id: str,
    first_name: str,
    middle_name: str,
    last_name: str,
    gender: str,
    date_of_birth: date,
    admission_date: date | None = None,
    grade_id: str | None = None,
    section_id: str | None = None,
    stream: str | None = None,
    medical_notes: str | None = None,
    academic_year_id: str | None = None,
    address: str | None = None,
    nationality: str | None = None,
    blood_group: str | None = None,
    photo_url: str | None = None,
    emergency_contact: str | None = None,
    school_id: str | None = None,
    branch_id: str | None = None,
    registered_by: str | None = None,
) -> Student:
    """Register a new student"""
    student = Student(
        student_id=student_id,
        first_name=first_name,
        middle_name=middle_name,
        last_name=last_name,
        gender=gender,
        date_of_birth=date_of_birth,
        admission_date=admission_date or date.today(),
        grade_id=grade_id,
        section_id=section_id,
        stream=stream,
        medical_notes=medical_notes,
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
    db.add(student)
    db.commit()
    db.refresh(student)

    log_audit(
        db=db,
        table_name="students",
        record_id=student.id,
        action="STUDENT_CREATED",
        new_data={
            "student_id": student_id,
            "first_name": first_name,
            "last_name": last_name,
            "gender": gender,
        },
        user_id=registered_by,
    )

    return student


def get_student(db: Session, student_id: str) -> Student | None:
    return db.query(Student).filter(
        Student.id == student_id,
        Student.deleted_at.is_(None),
    ).first()


def get_student_by_student_id(db: Session, student_id: str) -> Student | None:
    return db.query(Student).filter(
        Student.student_id == student_id,
        Student.deleted_at.is_(None),
    ).first()


def search_students(
    db: Session,
    query: str | None = None,
    grade_id: str | None = None,
    section_id: str | None = None,
    status: str | None = None,
    school_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Student]:
    q = db.query(Student).filter(Student.deleted_at.is_(None))

    if query:
        like = f"%{query}%"
        q = q.filter(
            db.or_(
                Student.student_id.ilike(like),
                Student.first_name.ilike(like),
                Student.middle_name.ilike(like),
                Student.last_name.ilike(like),
            )
        )
    if grade_id:
        q = q.filter(Student.grade_id == grade_id)
    if section_id:
        q = q.filter(Student.section_id == section_id)
    if status:
        q = q.filter(Student.status == status)
    if school_id:
        q = q.filter(Student.school_id == school_id)

    return q.order_by(Student.created_at.desc()).offset(skip).limit(limit).all()


def update_student(db: Session, student_id: str, data: dict) -> Student | None:
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.deleted_at.is_(None),
    ).first()
    if not student:
        return None

    old_data = {c.name: getattr(student, c.name) for c in student.__table__.columns}

    for key, value in data.items():
        if value is not None and hasattr(student, key):
            setattr(student, key, value)

    student.updated_at = datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        table_name="students",
        record_id=student.id,
        action="STUDENT_UPDATED",
        old_data=old_data,
        new_data=data,
    )

    return student


def delete_student(db: Session, student_id: str) -> bool:
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.deleted_at.is_(None),
    ).first()
    if not student:
        return False

    student.deleted_at = datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        table_name="students",
        record_id=student.id,
        action="STUDENT_DELETED",
    )

    return True


def transfer_student(db: Session, student_id: str, grade_id: str, section_id: str | None = None, reason: str | None = None) -> Student | None:
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.deleted_at.is_(None),
    ).first()
    if not student:
        return None

    old_data = {"grade_id": student.grade_id, "section_id": student.section_id}

    student.grade_id = grade_id
    if section_id:
        student.section_id = section_id
    student.updated_at = datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        table_name="students",
        record_id=student.id,
        action="STUDENT_TRANSFERRED",
        old_data=old_data,
        new_data={"grade_id": grade_id, "section_id": section_id, "reason": reason},
    )

    return student


def bulk_create_students(db: Session, students_data: list[dict]) -> list[Student]:
    created = []
    for data in students_data:
        student = Student(**data)
        db.add(student)
        created.append(student)
    db.commit()
    for s in created:
        db.refresh(s)
    return created


def promote_student(db: Session, student_id: str, to_grade_id: str, academic_year_id: str) -> Student | None:
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.deleted_at.is_(None),
    ).first()
    if not student:
        return None

    old_data = {"grade_id": student.grade_id, "academic_year_id": student.academic_year_id}
    student.grade_id = to_grade_id
    student.academic_year_id = academic_year_id
    student.updated_at = datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        table_name="students",
        record_id=student.id,
        action="STUDENT_PROMOTED",
        old_data=old_data,
        new_data={"to_grade_id": to_grade_id, "academic_year_id": academic_year_id},
    )

    return student
