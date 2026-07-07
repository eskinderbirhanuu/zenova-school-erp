from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.teacher import (
    TeacherCreate, TeacherUpdate, TeacherResponse, TeacherListResult,
    AssignGradeRequest, AssignSectionRequest,
)
from app.services import teacher_service, id_service, qr_service, nfc_service
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User

router = APIRouter(tags=["teachers"])


@router.post("/teachers", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    data: TeacherCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.TEACHER_CREATE),
):
    """Create a teacher account (DIRECTOR only)"""
    # Tenant scoping: body school_id honored only for SUPER_ADMIN.
    school_id = (data.school_id if current_user.is_superuser else None) or current_user.school_id
    branch_id = (data.branch_id if current_user.is_superuser else None) or current_user.branch_id
    teacher_id = id_service.generate_id(db, "teacher", school_id)
    password = data.password or "changeme123"

    try:
        result = teacher_service.create_teacher(
            db=db,
            teacher_id=teacher_id,
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            password=password,
            gender=data.gender,
            qualification=data.qualification,
            department=data.department,
            employment_date=data.employment_date,
            photo_url=data.photo_url,
                school_id=school_id,
                branch_id=branch_id,
                created_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return TeacherResponse(
        id=result["profile"].id,
        teacher_id=result["profile"].teacher_id,
        user_id=result["user"].id,
        full_name=result["user"].full_name,
        email=result["user"].email,
        phone=result["user"].phone,
        qualification=result["profile"].qualification,
        department=result["profile"].department,
        employment_date=result["profile"].employment_date,
        photo_url=result["user"].photo_url,
        is_active=result["user"].is_active,
        created_at=result["user"].created_at,
    )


@router.patch("/teachers/{teacher_id}", response_model=TeacherResponse)
def update_teacher(
    teacher_id: str,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update own teacher profile (TEACHER) or any teacher (DIRECTOR/ADMIN)"""
    school_id = current_user.school_id
    try:
        result = teacher_service.update_teacher_profile(
            db=db,
            teacher_id=teacher_id,
            school_id=school_id,
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            qualification=data.qualification,
            department=data.department,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return TeacherResponse(
        id=result["profile"].id,
        teacher_id=result["profile"].teacher_id,
        user_id=result["user"].id,
        full_name=result["user"].full_name,
        email=result["user"].email,
        phone=result["user"].phone,
        qualification=result["profile"].qualification,
        department=result["profile"].department,
        employment_date=result["profile"].employment_date,
        photo_url=result["user"].photo_url,
        is_active=result["user"].is_active,
        created_at=result["user"].created_at,
    )


@router.get("/teachers", response_model=list[TeacherListResult])
def list_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    teachers = teacher_service.list_teachers(db, current_user.school_id)
    return [TeacherListResult(**t) for t in teachers]


@router.post("/teachers/{teacher_id}/assign-grade")
def assign_teacher_grade(
    teacher_id: str,
    data: AssignGradeRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.TEACHER_CREATE),
):
    assignment = teacher_service.assign_grade(db, teacher_id, data.grade_id, current_user.school_id)
    return {"message": "Grade assigned", "teacher_id": teacher_id, "grade_id": data.grade_id}


@router.post("/teachers/{teacher_id}/assign-section")
def assign_teacher_section(
    teacher_id: str,
    data: AssignSectionRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.TEACHER_CREATE),
):
    assignment = teacher_service.assign_section(db, teacher_id, data.section_id, current_user.school_id)
    return {"message": "Section assigned", "teacher_id": teacher_id, "section_id": data.section_id}


@router.post("/teachers/{teacher_id}/generate-qr")
def generate_teacher_qr(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.TEACHER_CREATE),
):
    from app.models.teacher_profile import TeacherProfile
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.teacher_id == teacher_id,
        TeacherProfile.school_id == current_user.school_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    qr = qr_service.generate_qr(db, "teacher", profile.user_id, current_user.school_id, user_id=current_user.id)
    return {"uuid": qr.uuid}


@router.post("/teachers/{teacher_id}/assign-nfc")
def assign_teacher_nfc(
    teacher_id: str,
    card_uid: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.TEACHER_CREATE),
):
    from app.models.teacher_profile import TeacherProfile
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.teacher_id == teacher_id,
        TeacherProfile.school_id == current_user.school_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    try:
        nfc = nfc_service.assign_nfc(db, card_uid, "teacher", profile.user_id, current_user.school_id, current_user.id)
        return {"card_uid": nfc.card_uid, "status": nfc.status}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/teachers/{teacher_id}/assign-subjects")
def assign_teacher_subjects(
    teacher_id: str,
    subject_ids: list[str],
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.TEACHER_CREATE),
):
    from app.models.teacher_profile import TeacherProfile
    from app.models.teacher_subject import TeacherSubject
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.teacher_id == teacher_id,
        TeacherProfile.school_id == current_user.school_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    existing = {ts.subject_id for ts in db.query(TeacherSubject).filter(TeacherSubject.teacher_profile_id == profile.id).all()}
    added = []
    for sid in subject_ids:
        if sid not in existing:
            ts = TeacherSubject(teacher_profile_id=profile.id, subject_id=sid, school_id=current_user.school_id)
            db.add(ts)
            added.append(sid)
    db.commit()
    return {"message": f"{len(added)} subjects assigned", "teacher_id": teacher_id, "subject_ids": added}


@router.get("/teachers/me/subjects", response_model=list[dict])
def get_my_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.teacher_profile import TeacherProfile
    from app.models.teacher_subject import TeacherSubject
    from app.models.subject import Subject
    profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")
    results = db.query(Subject).join(TeacherSubject, TeacherSubject.subject_id == Subject.id).filter(
        TeacherSubject.teacher_profile_id == profile.id,
        TeacherSubject.school_id == current_user.school_id,
    ).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in results]


@router.get("/teachers/me/profile")
def get_my_teacher_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.teacher_profile import TeacherProfile
    profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")
    return {"id": profile.id, "teacher_id": profile.teacher_id, "user_id": profile.user_id}


@router.patch("/teachers/me", response_model=TeacherResponse)
def update_my_teacher_profile(
    data: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.teacher_profile import TeacherProfile
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id,
        TeacherProfile.school_id == current_user.school_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")
    try:
        result = teacher_service.update_teacher_profile(
            db=db,
            teacher_id=profile.id,
            school_id=current_user.school_id,
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            qualification=data.qualification,
            department=data.department,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return TeacherResponse(
        id=result["profile"].id,
        teacher_id=result["profile"].teacher_id,
        user_id=result["user"].id,
        full_name=result["user"].full_name,
        email=result["user"].email,
        phone=result["user"].phone,
        qualification=result["profile"].qualification,
        department=result["profile"].department,
        employment_date=result["profile"].employment_date,
        photo_url=result["user"].photo_url,
        is_active=result["user"].is_active,
        created_at=result["user"].created_at,
    )


@router.get("/teachers/{teacher_id}/subjects", response_model=list[dict])
def get_teacher_subjects(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.teacher_profile import TeacherProfile
    from app.models.teacher_subject import TeacherSubject
    from app.models.subject import Subject
    profile = db.query(TeacherProfile).filter(TeacherProfile.teacher_id == teacher_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    results = db.query(Subject).join(TeacherSubject, TeacherSubject.subject_id == Subject.id).filter(
        TeacherSubject.teacher_profile_id == profile.id,
        TeacherSubject.school_id == current_user.school_id,
    ).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in results]


@router.get("/teachers/me/students")
def get_my_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.teacher_profile import TeacherProfile
    from app.models.teacher_grade_assignment import TeacherGradeAssignment
    from app.models.student import Student
    from app.models.class_ import ClassGrade
    profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id,
        TeacherProfile.school_id == current_user.school_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    grade_ids = [
        r.grade_id for r in db.query(TeacherGradeAssignment.grade_id).filter(
            TeacherGradeAssignment.teacher_id == profile.id,
        ).all()
    ]
    if not grade_ids:
        return []

    grades = {g.id: g.name for g in db.query(ClassGrade).filter(ClassGrade.id.in_(grade_ids)).all()}
    students = db.query(Student).filter(
        Student.school_id == current_user.school_id,
        Student.grade_id.in_(grade_ids),
        Student.deleted_at.is_(None),
    ).order_by(Student.first_name).all()

    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "grade_name": grades.get(s.grade_id, s.grade_id or ""),
            "status": s.status,
        }
        for s in students
    ]
