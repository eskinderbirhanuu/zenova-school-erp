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


def _exists(db: Session, model, school_id: str) -> bool:
    return db.query(model).filter(model.school_id == school_id).first() is not None


@router.get("/setup/wizard-status")
def wizard_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school_id = current_user.school_id
    steps = {
        "academic_year": _exists(db, AcademicYear, school_id),
        "classes": _exists(db, ClassGrade, school_id),
        "sections": _exists(db, Section, school_id),
        "subjects": _exists(db, Subject, school_id),
        "teachers": _exists(db, TeacherProfile, school_id),
    }
    all_done = all(steps.values())
    return {"steps": steps, "all_done": all_done}
