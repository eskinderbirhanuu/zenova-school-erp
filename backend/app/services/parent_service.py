from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.parent import Parent
from app.models.parent_student_link import ParentStudentLink
from app.core.audit import log_audit


def create_parent(
    db: Session,
    full_name: str,
    phone_1: str,
    parent_id: str | None = None,
    relationship: str | None = None,
    phone_2: str | None = None,
    occupation: str | None = None,
    address: str | None = None,
    national_id: str | None = None,
    passport_id: str | None = None,
    kebele_id: str | None = None,
    photo_url: str | None = None,
    school_id: str | None = None,
) -> Parent:
    parent = Parent(
        parent_id=parent_id,
        full_name=full_name,
        relationship=relationship,
        phone_1=phone_1,
        phone_2=phone_2,
        occupation=occupation,
        address=address,
        national_id=national_id,
        passport_id=passport_id,
        kebele_id=kebele_id,
        photo_url=photo_url,
        school_id=school_id,
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)
    return parent


def smart_search_parents(db: Session, query: str, school_id: str | None = None, include_deleted: bool = False) -> list[Parent]:
    """Smart search: phone, national_id, passport_id, kebele_id, name"""
    like = f"%{query}%"
    q = db.query(Parent).filter(
        db.or_(
            Parent.phone_1.ilike(like),
            Parent.phone_2.ilike(like),
            Parent.national_id.ilike(like),
            Parent.passport_id.ilike(like),
            Parent.kebele_id.ilike(like),
            Parent.full_name.ilike(like),
        ),
    )
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(Parent.school_id == school_id)
    return q.all()


def get_parent(db: Session, parent_id: str, school_id: str = None, include_deleted: bool = False) -> Parent | None:
    q = db.query(Parent).filter(Parent.id == parent_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(Parent.school_id == school_id)
    return q.first()


def update_parent(db: Session, parent_id: str, data: dict, school_id: str = None, include_deleted: bool = False) -> Parent | None:
    q = db.query(Parent).filter(Parent.id == parent_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(Parent.school_id == school_id)
    parent = q.first()
    if not parent:
        return None

    for key, value in data.items():
        if value is not None and hasattr(parent, key):
            setattr(parent, key, value)

    parent.updated_at = datetime.now(timezone.utc)
    db.commit()
    return parent


def link_parent_to_student(
    db: Session,
    parent_id: str,
    student_id: str,
    relationship: str | None = None,
    is_primary: bool = False,
    school_id: str | None = None,
    user_id: str = None,
) -> ParentStudentLink:
    q = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == parent_id,
        ParentStudentLink.student_id == student_id,
    )
    if school_id:
        q = q.filter(ParentStudentLink.school_id == school_id)
    existing = q.first()

    if existing:
        return existing

    link = ParentStudentLink(
        parent_id=parent_id,
        student_id=student_id,
        relationship=relationship,
        is_primary=is_primary,
        school_id=school_id,
    )
    db.add(link)
    log_audit(
        db=db,
        user_id=user_id or "system",
        table_name="parent_student_links",
        record_id=f"{parent_id}_{student_id}",
        action="PARENT_LINKED",
        new_data={"parent_id": parent_id, "student_id": student_id},
        school_id=school_id,
    )
    db.commit()

    return link


def unlink_parent_from_student(db: Session, parent_id: str, student_id: str, school_id: str = None, user_id: str = None) -> bool:
    q = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == parent_id,
        ParentStudentLink.student_id == student_id,
    )
    if school_id:
        q = q.filter(ParentStudentLink.school_id == school_id)
    link = q.first()
    if not link:
        return False

    link.deleted_at = datetime.now(timezone.utc)
    log_audit(
        db=db,
        user_id=user_id or "system",
        table_name="parent_student_links",
        record_id=f"{parent_id}_{student_id}",
        action="PARENT_UNLINKED",
        school_id=school_id,
    )
    db.commit()

    return True


def get_linked_students(db: Session, parent_id: str, school_id: str = None) -> list[ParentStudentLink]:
    q = db.query(ParentStudentLink).filter(ParentStudentLink.parent_id == parent_id)
    if school_id:
        q = q.filter(ParentStudentLink.school_id == school_id)
    return q.all()


def get_linked_parents(db: Session, student_id: str, school_id: str = None) -> list[ParentStudentLink]:
    q = db.query(ParentStudentLink).filter(
        ParentStudentLink.student_id == student_id,
    )
    if school_id:
        q = q.filter(ParentStudentLink.school_id == school_id)
    return q.all()


def delete_parent(db: Session, parent_id: str, school_id: str = None, include_deleted: bool = False) -> bool:
    q = db.query(Parent).filter(Parent.id == parent_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(Parent.school_id == school_id)
    parent = q.first()
    if not parent:
        return False

    parent.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return True
