from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_grade_assignment import TeacherGradeAssignment
from app.models.teacher_section_assignment import TeacherSectionAssignment
from app.core.security import get_password_hash
from app.core.audit import log_audit
from app.core.exceptions import ConflictException, NotFoundException, BadRequestException
from app.core.error_codes import ErrorCode


def create_teacher(
    db: Session,
    teacher_id: str,
    full_name: str,
    email: str,
    phone: str,
    password: str,
    gender: str | None = None,
    qualification: str | None = None,
    department: str | None = None,
    employment_date: datetime | None = None,
    photo_url: str | None = None,
    school_id: str | None = None,
    branch_id: str | None = None,
    created_by: str | None = None,
) -> dict:
    """Create teacher (User + TeacherProfile)"""
    q = db.query(User).filter(User.email == email)
    if school_id:
        q = q.filter(User.school_id == school_id)
    existing = q.first()
    if existing:
        raise ConflictException("Email already exists", code=ErrorCode.CONFLICT_DUPLICATE_EMAIL)

    teacher_role = db.query(Role).filter(Role.name == "TEACHER").first()
    if not teacher_role:
        raise NotFoundException("TEACHER role not found. Run seed first.", code=ErrorCode.NOT_FOUND_ROLE)

    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        phone=phone,
        photo_url=photo_url,
        is_active=True,
        must_change_password=True,
        role_id=teacher_role.id,
        school_id=school_id,
        branch_id=branch_id,
    )
    db.add(user)
    db.flush()

    profile = TeacherProfile(
        user_id=user.id,
        teacher_id=teacher_id,
        qualification=qualification,
        department=department,
        employment_date=employment_date,
    )
    db.add(profile)
    log_audit(
        db=db,
        table_name="users",
        record_id=user.id,
        action="TEACHER_CREATED",
        new_data={"email": email, "full_name": full_name, "teacher_id": teacher_id},
        user_id=created_by,
        school_id=school_id,
    )
    db.commit()
    db.refresh(user)
    db.refresh(profile)

    return {"user": user, "profile": profile}


def assign_grade(db: Session, teacher_id: str, grade_id: str, school_id: str = None) -> TeacherGradeAssignment:
    q = db.query(TeacherGradeAssignment).filter(
        TeacherGradeAssignment.teacher_id == teacher_id,
        TeacherGradeAssignment.grade_id == grade_id,
    )
    if school_id:
        q = q.filter(TeacherGradeAssignment.school_id == school_id)
    existing = q.first()
    if existing:
        return existing

    assignment = TeacherGradeAssignment(teacher_id=teacher_id, grade_id=grade_id, school_id=school_id)
    db.add(assignment)
    db.commit()
    return assignment


def assign_section(db: Session, teacher_id: str, section_id: str, school_id: str = None) -> TeacherSectionAssignment:
    q = db.query(TeacherSectionAssignment).filter(
        TeacherSectionAssignment.teacher_id == teacher_id,
        TeacherSectionAssignment.section_id == section_id,
    )
    if school_id:
        q = q.filter(TeacherSectionAssignment.school_id == school_id)
    existing = q.first()
    if existing:
        return existing

    assignment = TeacherSectionAssignment(teacher_id=teacher_id, section_id=section_id, school_id=school_id)
    db.add(assignment)
    db.commit()
    return assignment


def remove_grade_assignment(db: Session, teacher_id: str, grade_id: str, school_id: str = None) -> bool:
    q = db.query(TeacherGradeAssignment).filter(
        TeacherGradeAssignment.teacher_id == teacher_id,
        TeacherGradeAssignment.grade_id == grade_id,
    )
    if school_id:
        q = q.filter(TeacherGradeAssignment.school_id == school_id)
    assignment = q.first()
    if not assignment:
        return False
    assignment.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return True


def remove_section_assignment(db: Session, teacher_id: str, section_id: str, school_id: str = None) -> bool:
    q = db.query(TeacherSectionAssignment).filter(
        TeacherSectionAssignment.teacher_id == teacher_id,
        TeacherSectionAssignment.section_id == section_id,
    )
    if school_id:
        q = q.filter(TeacherSectionAssignment.school_id == school_id)
    assignment = q.first()
    if not assignment:
        return False
    assignment.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return True


def list_teachers(db: Session, school_id: str | None = None) -> list[dict]:
    from app.models.teacher_profile import TeacherProfile
    query = db.query(User, TeacherProfile).join(TeacherProfile, User.id == TeacherProfile.user_id).filter(User.is_active == True)
    if school_id:
        query = query.filter(User.school_id == school_id)
    return [
        {
            "id": profile.id,
            "teacher_id": profile.teacher_id,
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "qualification": profile.qualification,
            "department": profile.department,
            "is_active": user.is_active,
        }
        for user, profile in query.all()
    ]


def update_teacher_profile(
    db: Session,
    teacher_id: str,
    school_id: str,
    full_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    qualification: str | None = None,
    department: str | None = None,
    address: str | None = None,
) -> dict:
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.teacher_id == teacher_id,
        TeacherProfile.school_id == school_id,
    ).first()
    if not profile:
        raise NotFoundException("Teacher not found", code=ErrorCode.NOT_FOUND_GENERIC)

    user = db.query(User).filter(User.id == profile.user_id).first()
    if not user:
        raise NotFoundException("User not found", code=ErrorCode.NOT_FOUND_USER)

    if full_name is not None:
        user.full_name = full_name
    if email is not None:
        existing_q = db.query(User).filter(User.email == email, User.id != user.id)
        if school_id:
            existing_q = existing_q.filter(User.school_id == school_id)
        existing = existing_q.first()
        if existing:
            raise ConflictException("Email already in use", code=ErrorCode.CONFLICT_DUPLICATE_EMAIL)
        user.email = email
    if phone is not None:
        user.phone = phone
    if qualification is not None:
        profile.qualification = qualification
    if department is not None:
        profile.department = department

    log_audit(
        db=db,
        table_name="teacher_profiles",
        record_id=profile.id,
        action="TEACHER_UPDATED",
        new_data={"teacher_id": teacher_id},
        user_id=profile.user_id,
        school_id=school_id,
    )
    db.commit()
    db.refresh(user)
    db.refresh(profile)

    return {"user": user, "profile": profile}


def get_teacher_by_user_id(db: Session, user_id: str) -> TeacherProfile | None:
    return db.query(TeacherProfile).filter(TeacherProfile.user_id == user_id).first()
