from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.academic_year import AcademicYear
from app.models.class_ import ClassGrade
from app.models.subject import Subject
from app.models.section import Section
from app.models.teacher_profile import TeacherProfile

router = APIRouter(tags=["setup-wizard"])


@router.get("/setup/wizard-status")
def wizard_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school_id = current_user.school_id
    has_academic_year = db.query(AcademicYear).filter(
        AcademicYear.school_id == school_id
    ).first() is not None
    has_classes = db.query(ClassGrade).filter(
        ClassGrade.school_id == school_id
    ).first() is not None
    has_sections = db.query(Section).filter(
        Section.school_id == school_id
    ).first() is not None
    has_subjects = db.query(Subject).filter(
        Subject.school_id == school_id
    ).first() is not None
    has_teachers = db.query(TeacherProfile).filter(
        TeacherProfile.school_id == school_id
    ).first() is not None

    steps = {
        "academic_year": has_academic_year,
        "classes": has_classes,
        "sections": has_sections,
        "subjects": has_subjects,
        "teachers": has_teachers,
    }
    all_done = all(steps.values())
    return {"steps": steps, "all_done": all_done}
