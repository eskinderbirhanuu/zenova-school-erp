from datetime import datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_grade_assignment import TeacherGradeAssignment
from app.models.teacher_section_assignment import TeacherSectionAssignment
from app.core.security import get_password_hash
from app.core.audit import log_audit


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
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError("Email already exists")

    teacher_role = db.query(Role).filter(Role.name == "TEACHER").first()
    if not teacher_role:
        raise ValueError("TEACHER role not found. Run seed first.")

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
    db.commit()
    db.refresh(user)
    db.refresh(profile)

    log_audit(
        db=db,
        table_name="users",
        record_id=user.id,
        action="TEACHER_CREATED",
        new_data={"email": email, "full_name": full_name, "teacher_id": teacher_id},
        user_id=created_by,
    )

    return {"user": user, "profile": profile}


def assign_grade(db: Session, teacher_id: str, grade_id: str) -> TeacherGradeAssignment:
    existing = db.query(TeacherGradeAssignment).filter(
        TeacherGradeAssignment.teacher_id == teacher_id,
        TeacherGradeAssignment.grade_id == grade_id,
    ).first()
    if existing:
        return existing

    assignment = TeacherGradeAssignment(teacher_id=teacher_id, grade_id=grade_id)
    db.add(assignment)
    db.commit()
    return assignment


def assign_section(db: Session, teacher_id: str, section_id: str) -> TeacherSectionAssignment:
    existing = db.query(TeacherSectionAssignment).filter(
        TeacherSectionAssignment.teacher_id == teacher_id,
        TeacherSectionAssignment.section_id == section_id,
    ).first()
    if existing:
        return existing

    assignment = TeacherSectionAssignment(teacher_id=teacher_id, section_id=section_id)
    db.add(assignment)
    db.commit()
    return assignment


def remove_grade_assignment(db: Session, teacher_id: str, grade_id: str) -> bool:
    assignment = db.query(TeacherGradeAssignment).filter(
        TeacherGradeAssignment.teacher_id == teacher_id,
        TeacherGradeAssignment.grade_id == grade_id,
    ).first()
    if not assignment:
        return False
    db.delete(assignment)
    db.commit()
    return True


def remove_section_assignment(db: Session, teacher_id: str, section_id: str) -> bool:
    assignment = db.query(TeacherSectionAssignment).filter(
        TeacherSectionAssignment.teacher_id == teacher_id,
        TeacherSectionAssignment.section_id == section_id,
    ).first()
    if not assignment:
        return False
    db.delete(assignment)
    db.commit()
    return True


def list_teachers(db: Session, school_id: str | None = None) -> list[dict]:
    query = db.query(User).join(TeacherProfile, User.id == TeacherProfile.user_id).filter(User.is_active == True)
    if school_id:
        query = query.filter(User.school_id == school_id)
    users = query.all()

    result = []
    for user in users:
        profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first()
        if profile:
            result.append({
                "id": profile.id,
                "teacher_id": profile.teacher_id,
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "qualification": profile.qualification,
                "department": profile.department,
                "is_active": user.is_active,
            })
    return result


def get_teacher_by_user_id(db: Session, user_id: str) -> TeacherProfile | None:
    return db.query(TeacherProfile).filter(TeacherProfile.user_id == user_id).first()
