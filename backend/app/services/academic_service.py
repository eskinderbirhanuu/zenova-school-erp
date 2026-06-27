from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.academic_year import AcademicYear, Semester
from app.models.class_ import ClassGrade
from app.models.section import Section
from app.models.subject import Subject
from app.models.classroom import Classroom
from app.models.timetable import TimetableEntry
from app.models.exam import ExamType, Exam, ExamResult
from app.models.report_card import PromotionRecord
from app.models.student import Student as StudentModel
from app.core.audit import log_audit


def get_academic_years(db: Session, school_id: str):
    return db.query(AcademicYear).filter(AcademicYear.school_id == school_id).all()


def create_academic_year(db: Session, school_id: str, data, user_id: str):
    year = AcademicYear(name=data.name, start_date=data.start_date, end_date=data.end_date, school_id=school_id)
    db.add(year)
    db.commit()
    db.refresh(year)
    log_audit(db, user_id, "CREATE", "academic_year", year.id, f"Academic year '{data.name}' created")
    return year


def set_current_academic_year(db: Session, year_id: str, school_id: str, user_id: str):
    db.query(AcademicYear).filter(AcademicYear.school_id == school_id).update({"is_current": False})
    year = db.query(AcademicYear).filter(AcademicYear.id == year_id, AcademicYear.school_id == school_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    year.is_current = True
    db.commit()
    log_audit(db, user_id, "UPDATE", "academic_year", year_id, "Set as current academic year")
    return year


def create_semester(db: Session, data, user_id: str):
    semester = Semester(name=data.name, academic_year_id=data.academic_year_id, start_date=data.start_date, end_date=data.end_date)
    db.add(semester)
    db.commit()
    db.refresh(semester)
    log_audit(db, user_id, "CREATE", "semester", semester.id, f"Semester '{data.name}' created")
    return semester


def get_semesters(db: Session, academic_year_id: str):
    return db.query(Semester).filter(Semester.academic_year_id == academic_year_id).all()


def create_class_grade(db: Session, school_id: str, data, user_id: str):
    cls = ClassGrade(name=data.name, code=data.code, school_id=school_id)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    log_audit(db, user_id, "CREATE", "class", cls.id, f"Class grade '{data.name}' created")
    return cls


def get_classes(db: Session, school_id: str):
    return db.query(ClassGrade).filter(ClassGrade.school_id == school_id).all()


def update_class_grade(db: Session, class_id: str, data, user_id: str):
    cls = db.query(ClassGrade).filter(ClassGrade.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if data.name is not None:
        cls.name = data.name
    if data.code is not None:
        cls.code = data.code
    db.commit()
    db.refresh(cls)
    log_audit(db, user_id, "UPDATE", "class", class_id, f"Class grade updated to '{cls.name}'")
    return cls


def delete_class_grade(db: Session, class_id: str, user_id: str):
    cls = db.query(ClassGrade).filter(ClassGrade.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(cls)
    db.commit()
    log_audit(db, user_id, "DELETE", "class", class_id, "Class grade deleted")


def create_section(db: Session, data, user_id: str):
    sec = Section(name=data.name, class_id=data.class_id, capacity=data.capacity)
    db.add(sec)
    db.commit()
    db.refresh(sec)
    log_audit(db, user_id, "CREATE", "section", sec.id, f"Section '{data.name}' created")
    return sec


def get_sections(db: Session, class_id: str):
    return db.query(Section).filter(Section.class_id == class_id).all()


def update_section(db: Session, section_id: str, data, user_id: str):
    sec = db.query(Section).filter(Section.id == section_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    if data.name is not None:
        sec.name = data.name
    if data.capacity is not None:
        sec.capacity = data.capacity
    db.commit()
    db.refresh(sec)
    log_audit(db, user_id, "UPDATE", "section", section_id, f"Section updated to '{sec.name}'")
    return sec


def delete_section(db: Session, section_id: str, user_id: str):
    sec = db.query(Section).filter(Section.id == section_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(sec)
    db.commit()
    log_audit(db, user_id, "DELETE", "section", section_id, "Section deleted")


def create_subject(db: Session, data, user_id: str):
    sub = Subject(name=data.name, code=data.code, class_id=data.class_id, is_optional=data.is_optional)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    log_audit(db, user_id, "CREATE", "subject", sub.id, f"Subject '{data.name}' created")
    return sub


def get_subjects(db: Session, class_id: str):
    return db.query(Subject).filter(Subject.class_id == class_id).all()


def update_subject(db: Session, subject_id: str, data, user_id: str):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    if data.name is not None:
        sub.name = data.name
    if data.code is not None:
        sub.code = data.code
    if data.is_optional is not None:
        sub.is_optional = data.is_optional
    db.commit()
    db.refresh(sub)
    log_audit(db, user_id, "UPDATE", "subject", subject_id, f"Subject updated to '{sub.name}'")
    return sub


def delete_subject(db: Session, subject_id: str, user_id: str):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(sub)
    db.commit()
    log_audit(db, user_id, "DELETE", "subject", subject_id, "Subject deleted")


def create_classroom(db: Session, school_id: str, data, user_id: str):
    room = Classroom(name=data.name, capacity=data.capacity, school_id=school_id)
    db.add(room)
    db.commit()
    db.refresh(room)
    log_audit(db, user_id, "CREATE", "classroom", room.id, f"Classroom '{data.name}' created")
    return room


def get_classrooms(db: Session, school_id: str):
    return db.query(Classroom).filter(Classroom.school_id == school_id).all()


def update_classroom(db: Session, classroom_id: str, data, user_id: str):
    room = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found")
    if data.name is not None:
        room.name = data.name
    if data.capacity is not None:
        room.capacity = data.capacity
    db.commit()
    db.refresh(room)
    log_audit(db, user_id, "UPDATE", "classroom", classroom_id, f"Classroom updated to '{room.name}'")
    return room


def delete_classroom(db: Session, classroom_id: str, user_id: str):
    room = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found")
    db.delete(room)
    db.commit()
    log_audit(db, user_id, "DELETE", "classroom", classroom_id, "Classroom deleted")


def create_timetable_entry(db: Session, data, user_id: str):
    entry = TimetableEntry(
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        section_id=data.section_id,
        classroom_id=data.classroom_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    log_audit(db, user_id, "CREATE", "timetable_entry", entry.id, "Timetable entry created")
    return entry


def update_timetable_entry(db: Session, entry_id: str, data, user_id: str):
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    if data.day_of_week is not None:
        entry.day_of_week = data.day_of_week
    if data.start_time is not None:
        entry.start_time = data.start_time
    if data.end_time is not None:
        entry.end_time = data.end_time
    if data.subject_id is not None:
        entry.subject_id = data.subject_id
    if data.teacher_id is not None:
        entry.teacher_id = data.teacher_id
    if data.classroom_id is not None:
        entry.classroom_id = data.classroom_id
    db.commit()
    db.refresh(entry)
    log_audit(db, user_id, "UPDATE", "timetable_entry", entry_id, "Timetable entry updated")
    return entry


def delete_timetable_entry(db: Session, entry_id: str, user_id: str):
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    db.delete(entry)
    db.commit()
    log_audit(db, user_id, "DELETE", "timetable_entry", entry_id, "Timetable entry deleted")


def get_timetable(db: Session, section_id: str):
    return db.query(TimetableEntry).filter(TimetableEntry.section_id == section_id).order_by(TimetableEntry.day_of_week, TimetableEntry.start_time).all()


def create_exam_type(db: Session, data, user_id: str):
    et = ExamType(name=data.name, weight=data.weight)
    db.add(et)
    db.commit()
    db.refresh(et)
    log_audit(db, user_id, "CREATE", "exam_type", et.id, f"Exam type '{data.name}' created")
    return et


def get_exam_types(db: Session):
    return db.query(ExamType).all()


def create_exam(db: Session, data, user_id: str):
    exam = Exam(
        name=data.name, exam_type_id=data.exam_type_id,
        subject_id=data.subject_id, class_id=data.class_id,
        semester_id=data.semester_id, exam_date=data.exam_date,
        max_score=data.max_score,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    log_audit(db, user_id, "CREATE", "exam", exam.id, f"Exam '{data.name}' created")
    return exam


def update_exam(db: Session, exam_id: str, data, user_id: str):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if data.name is not None:
        exam.name = data.name
    if data.exam_date is not None:
        exam.exam_date = data.exam_date
    if data.max_score is not None:
        exam.max_score = data.max_score
    db.commit()
    db.refresh(exam)
    log_audit(db, user_id, "UPDATE", "exam", exam_id, f"Exam updated to '{exam.name}'")
    return exam


def get_exams(db: Session, class_id: str = None, subject_id: str = None, semester_id: str = None):
    q = db.query(Exam)
    if class_id:
        q = q.filter(Exam.class_id == class_id)
    if subject_id:
        q = q.filter(Exam.subject_id == subject_id)
    if semester_id:
        q = q.filter(Exam.semester_id == semester_id)
    return q.all()


def create_exam_result(db: Session, data, user_id: str):
    result = ExamResult(exam_id=data.exam_id, student_id=data.student_id, score=data.score, remarks=data.remarks, entered_by=user_id)
    db.add(result)
    db.commit()
    db.refresh(result)
    log_audit(db, user_id, "CREATE", "exam_result", result.id, f"Result recorded for exam {data.exam_id}")
    return result


def bulk_create_exam_results(db: Session, results_list: list, user_id: str):
    created = []
    for data in results_list:
        r = ExamResult(exam_id=data.exam_id, student_id=data.student_id, score=data.score, remarks=data.remarks, entered_by=user_id)
        db.add(r)
        created.append(r)
    db.commit()
    for r in created:
        db.refresh(r)
    log_audit(db, user_id, "BULK_CREATE", "exam_result", ",".join(r.id for r in created[:10]), f"{len(created)} results recorded")
    return created


def update_exam_result(db: Session, result_id: str, data, user_id: str):
    result = db.query(ExamResult).filter(ExamResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Exam result not found")
    if data.score is not None:
        result.score = data.score
    if data.remarks is not None:
        result.remarks = data.remarks
    db.commit()
    db.refresh(result)
    log_audit(db, user_id, "UPDATE", "exam_result", result_id, "Exam result updated")
    return result


def get_exam_results(db: Session, exam_id: str):
    return db.query(ExamResult).filter(ExamResult.exam_id == exam_id).all()


def promote_student(db: Session, student_id: str, to_class_id: str, academic_year_id: str, user_id: str):
    student = db.query(StudentModel).filter(StudentModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    from_class_id = student.current_class_id
    if not from_class_id:
        raise HTTPException(status_code=400, detail="Student has no current class")
    pr = PromotionRecord(student_id=student_id, from_class_id=from_class_id, to_class_id=to_class_id, academic_year_id=academic_year_id, promoted_by=user_id)
    student.current_class_id = to_class_id
    db.add(pr)
    db.commit()
    db.refresh(pr)
    log_audit(db, user_id, "CREATE", "promotion", pr.id, f"Student {student_id} promoted from {from_class_id} to {to_class_id}")
    return pr


def get_promotion_history(db: Session, student_id: str):
    return db.query(PromotionRecord).filter(PromotionRecord.student_id == student_id).order_by(PromotionRecord.created_at.desc()).all()


def bulk_promote_students(db: Session, student_ids: list[str], to_class_id: str, academic_year_id: str, user_id: str):
    promoted = []
    for sid in student_ids:
        student = db.query(StudentModel).filter(StudentModel.id == sid).first()
        if not student:
            continue
        from_class_id = student.current_class_id
        if not from_class_id:
            continue
        pr = PromotionRecord(student_id=sid, from_class_id=from_class_id, to_class_id=to_class_id, academic_year_id=academic_year_id, promoted_by=user_id)
        student.current_class_id = to_class_id
        db.add(pr)
        promoted.append(pr)
    db.commit()
    for pr in promoted:
        db.refresh(pr)
    log_audit(db, user_id, "BULK_PROMOTE", "promotion", f"{len(promoted)} students", f"Promoted {len(promoted)} students to class {to_class_id}")
    return promoted
