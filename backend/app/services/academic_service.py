from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundException, BadRequestException
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


def get_academic_years(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(AcademicYear).filter(AcademicYear.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_academic_year(db: Session, school_id: str, data, user_id: str):
    year = AcademicYear(name=data.name, start_date=data.start_date, end_date=data.end_date, school_id=school_id)
    db.add(year)
    log_audit(db, user_id, "CREATE", "academic_year", year.id, f"Academic year '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(year)
    return year


def set_current_academic_year(db: Session, year_id: str, school_id: str, user_id: str):
    db.query(AcademicYear).filter(AcademicYear.school_id == school_id).update({"is_current": False})
    year = db.query(AcademicYear).filter(AcademicYear.id == year_id, AcademicYear.school_id == school_id).first()
    if not year:
        raise NotFoundException("Academic year not found")
    year.is_current = True
    log_audit(db, user_id, "UPDATE", "academic_year", year_id, "Set as current academic year", school_id=school_id)
    db.commit()
    return year


def create_semester(db: Session, school_id: str, data, user_id: str):
    semester = Semester(name=data.name, academic_year_id=data.academic_year_id, start_date=data.start_date, end_date=data.end_date)
    db.add(semester)
    log_audit(db, user_id, "CREATE", "semester", semester.id, f"Semester '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(semester)
    return semester


def get_semesters(db: Session, school_id: str, academic_year_id: str, include_deleted: bool = False):
    q = db.query(Semester).join(AcademicYear).filter(
        AcademicYear.school_id == school_id,
        Semester.academic_year_id == academic_year_id
    )
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_class_grade(db: Session, school_id: str, data, user_id: str):
    cls = ClassGrade(name=data.name, code=data.code, school_id=school_id)
    db.add(cls)
    log_audit(db, user_id, "CREATE", "class", cls.id, f"Class grade '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(cls)
    return cls


def get_classes(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(ClassGrade).filter(ClassGrade.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def update_class_grade(db: Session, class_id: str, data, user_id: str, school_id: str):
    cls = db.query(ClassGrade).filter(ClassGrade.id == class_id, ClassGrade.school_id == school_id).first()
    if not cls:
        raise NotFoundException("Class not found")
    if data.name is not None:
        cls.name = data.name
    if data.code is not None:
        cls.code = data.code
    log_audit(db, user_id, "UPDATE", "class", class_id, f"Class grade updated to '{cls.name}'", school_id=school_id)
    db.commit()
    db.refresh(cls)
    return cls


def delete_class_grade(db: Session, class_id: str, user_id: str, school_id: str):
    cls = db.query(ClassGrade).filter(ClassGrade.id == class_id, ClassGrade.school_id == school_id).first()
    if not cls:
        raise NotFoundException("Class not found")
    cls.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "DELETE", "class", class_id, "Class grade deleted", school_id=school_id)
    db.commit()


def create_section(db: Session, school_id: str, data, user_id: str):
    sec = Section(name=data.name, class_id=data.class_id, capacity=data.capacity, school_id=school_id)
    db.add(sec)
    log_audit(db, user_id, "CREATE", "section", sec.id, f"Section '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(sec)
    return sec


def get_sections(db: Session, school_id: str, class_id: str, include_deleted: bool = False):
    q = db.query(Section).filter(Section.school_id == school_id, Section.class_id == class_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def update_section(db: Session, section_id: str, data, user_id: str, school_id: str):
    sec = db.query(Section).filter(Section.id == section_id, Section.school_id == school_id).first()
    if not sec:
        raise NotFoundException("Section not found")
    if data.name is not None:
        sec.name = data.name
    if data.capacity is not None:
        sec.capacity = data.capacity
    log_audit(db, user_id, "UPDATE", "section", section_id, f"Section updated to '{sec.name}'", school_id=school_id)
    db.commit()
    db.refresh(sec)
    return sec


def delete_section(db: Session, section_id: str, user_id: str, school_id: str):
    sec = db.query(Section).filter(Section.id == section_id, Section.school_id == school_id).first()
    if not sec:
        raise NotFoundException("Section not found")
    sec.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "DELETE", "section", section_id, "Section deleted", school_id=school_id)
    db.commit()


def create_subject(db: Session, school_id: str, data, user_id: str):
    sub = Subject(name=data.name, code=data.code, class_id=data.class_id, is_optional=data.is_optional, school_id=school_id)
    db.add(sub)
    log_audit(db, user_id, "CREATE", "subject", sub.id, f"Subject '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(sub)
    return sub


def get_subjects(db: Session, school_id: str, class_id: str, include_deleted: bool = False):
    q = db.query(Subject).filter(Subject.school_id == school_id, Subject.class_id == class_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def update_subject(db: Session, subject_id: str, data, user_id: str, school_id: str):
    sub = db.query(Subject).filter(Subject.id == subject_id, Subject.school_id == school_id).first()
    if not sub:
        raise NotFoundException("Subject not found")
    if data.name is not None:
        sub.name = data.name
    if data.code is not None:
        sub.code = data.code
    if data.is_optional is not None:
        sub.is_optional = data.is_optional
    log_audit(db, user_id, "UPDATE", "subject", subject_id, f"Subject updated to '{sub.name}'", school_id=school_id)
    db.commit()
    db.refresh(sub)
    return sub


def delete_subject(db: Session, subject_id: str, user_id: str, school_id: str):
    sub = db.query(Subject).filter(Subject.id == subject_id, Subject.school_id == school_id).first()
    if not sub:
        raise NotFoundException("Subject not found")
    sub.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "DELETE", "subject", subject_id, "Subject deleted", school_id=school_id)
    db.commit()


def create_classroom(db: Session, school_id: str, data, user_id: str):
    room = Classroom(name=data.name, capacity=data.capacity, school_id=school_id)
    db.add(room)
    log_audit(db, user_id, "CREATE", "classroom", room.id, f"Classroom '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(room)
    return room


def get_classrooms(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(Classroom).filter(Classroom.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def update_classroom(db: Session, classroom_id: str, data, user_id: str, school_id: str):
    room = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.school_id == school_id).first()
    if not room:
        raise NotFoundException("Classroom not found")
    if data.name is not None:
        room.name = data.name
    if data.capacity is not None:
        room.capacity = data.capacity
    log_audit(db, user_id, "UPDATE", "classroom", classroom_id, f"Classroom updated to '{room.name}'", school_id=school_id)
    db.commit()
    db.refresh(room)
    return room


def delete_classroom(db: Session, classroom_id: str, user_id: str, school_id: str):
    room = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.school_id == school_id).first()
    if not room:
        raise NotFoundException("Classroom not found")
    room.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "DELETE", "classroom", classroom_id, "Classroom deleted", school_id=school_id)
    db.commit()


def check_timetable_conflicts(db: Session, school_id: str, day_of_week: int, start_time, end_time,
                               teacher_id: str = None, section_id: str = None,
                               classroom_id: str = None, exclude_id: str = None) -> list[str]:
    conflicts = []
    base = db.query(TimetableEntry).filter(
        TimetableEntry.school_id == school_id,
        TimetableEntry.day_of_week == day_of_week,
        TimetableEntry.start_time < end_time,
        TimetableEntry.end_time > start_time,
    )
    if exclude_id:
        base = base.filter(TimetableEntry.id != exclude_id)
    if teacher_id:
        teacher_overlap = base.filter(TimetableEntry.teacher_id == teacher_id).first()
        if teacher_overlap:
            conflicts.append("Teacher is already assigned to another class at this time")
    if section_id:
        section_overlap = base.filter(TimetableEntry.section_id == section_id).first()
        if section_overlap:
            conflicts.append("Section already has a lesson at this time")
    if classroom_id:
        room_overlap = base.filter(TimetableEntry.classroom_id == classroom_id).first()
        if room_overlap:
            conflicts.append("Classroom is already booked at this time")
    return conflicts


def create_timetable_entry(db: Session, school_id: str, data, user_id: str):
    conflicts = check_timetable_conflicts(
        db, school_id, data.day_of_week, data.start_time, data.end_time,
        teacher_id=data.teacher_id, section_id=data.section_id, classroom_id=data.classroom_id,
    )
    entry = TimetableEntry(
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        section_id=data.section_id,
        classroom_id=data.classroom_id,
        school_id=school_id,
    )
    db.add(entry)
    log_audit(db, user_id, "CREATE", "timetable_entry", entry.id, "Timetable entry created", school_id=school_id)
    db.commit()
    db.refresh(entry)
    return entry


def update_timetable_entry(db: Session, entry_id: str, data, user_id: str, school_id: str):
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id, TimetableEntry.school_id == school_id).first()
    if not entry:
        raise NotFoundException("Timetable entry not found")
    day = data.day_of_week if data.day_of_week is not None else entry.day_of_week
    st = data.start_time if data.start_time is not None else entry.start_time
    et = data.end_time if data.end_time is not None else entry.end_time
    tid = data.teacher_id if data.teacher_id is not None else entry.teacher_id
    sid = data.section_id if data.section_id is not None else entry.section_id
    cid = data.classroom_id if data.classroom_id is not None else entry.classroom_id
    conflicts = check_timetable_conflicts(db, school_id, day, st, et, teacher_id=tid, section_id=sid, classroom_id=cid, exclude_id=entry_id)
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
    log_audit(db, user_id, "UPDATE", "timetable_entry", entry_id, "Timetable entry updated", school_id=school_id)
    db.commit()
    db.refresh(entry)
    return entry


def delete_timetable_entry(db: Session, entry_id: str, user_id: str, school_id: str):
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id, TimetableEntry.school_id == school_id).first()
    if not entry:
        raise NotFoundException("Timetable entry not found")
    entry.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "DELETE", "timetable_entry", entry_id, "Timetable entry deleted", school_id=school_id)
    db.commit()


def get_timetable(db: Session, school_id: str, section_id: str, include_deleted: bool = False):
    q = db.query(TimetableEntry).filter(TimetableEntry.school_id == school_id, TimetableEntry.section_id == section_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(TimetableEntry.day_of_week, TimetableEntry.start_time).all()


def create_exam_type(db: Session, school_id: str, data, user_id: str):
    et = ExamType(name=data.name, weight=data.weight, school_id=school_id)
    db.add(et)
    log_audit(db, user_id, "CREATE", "exam_type", et.id, f"Exam type '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(et)
    return et


def get_exam_types(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(ExamType).filter(ExamType.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_exam(db: Session, school_id: str, data, user_id: str):
    exam = Exam(
        name=data.name, exam_type_id=data.exam_type_id,
        subject_id=data.subject_id, class_id=data.class_id,
        semester_id=data.semester_id, exam_date=data.exam_date,
        max_score=data.max_score, school_id=school_id,
    )
    db.add(exam)
    log_audit(db, user_id, "CREATE", "exam", exam.id, f"Exam '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(exam)
    return exam


def update_exam(db: Session, exam_id: str, data, user_id: str, school_id: str):
    exam = db.query(Exam).filter(Exam.id == exam_id, Exam.school_id == school_id).first()
    if not exam:
        raise NotFoundException("Exam not found")
    if data.name is not None:
        exam.name = data.name
    if data.exam_date is not None:
        exam.exam_date = data.exam_date
    if data.max_score is not None:
        exam.max_score = data.max_score
    log_audit(db, user_id, "UPDATE", "exam", exam_id, f"Exam updated to '{exam.name}'", school_id=school_id)
    db.commit()
    db.refresh(exam)
    return exam


def get_exams(db: Session, school_id: str, class_id: str = None, subject_id: str = None, semester_id: str = None, include_deleted: bool = False):
    q = db.query(Exam).filter(Exam.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if class_id:
        q = q.filter(Exam.class_id == class_id)
    if subject_id:
        q = q.filter(Exam.subject_id == subject_id)
    if semester_id:
        q = q.filter(Exam.semester_id == semester_id)
    return q.all()


def create_exam_result(db: Session, school_id: str, data, user_id: str):
    result = ExamResult(exam_id=data.exam_id, student_id=data.student_id, score=data.score, remarks=data.remarks, entered_by=user_id, school_id=school_id)
    db.add(result)
    log_audit(db, user_id, "CREATE", "exam_result", result.id, f"Result recorded for exam {data.exam_id}", school_id=school_id)
    db.commit()
    db.refresh(result)
    return result


def bulk_create_exam_results(db: Session, school_id: str, results_list: list, user_id: str):
    created = []
    student_ids = set()
    for data in results_list:
        r = ExamResult(exam_id=data.exam_id, student_id=data.student_id, score=data.score, remarks=data.remarks, entered_by=user_id, school_id=school_id)
        db.add(r)
        created.append(r)
        student_ids.add(data.student_id)
    log_audit(db, user_id, "BULK_CREATE", "exam_result", ",".join(r.id for r in created[:10]), f"{len(created)} results recorded", school_id=school_id)
    db.commit()
    for r in created:
        db.refresh(r)

    from app.models.parent_student_link import ParentStudentLink
    from app.models.parent import Parent
    from app.models.exam import Exam
    from app.services.communication_service import send_notification
    first_exam_id = results_list[0].exam_id if results_list else None
    exam_name = ""
    if first_exam_id:
        exam = db.query(Exam).filter(Exam.id == first_exam_id, Exam.school_id == school_id).first()
        exam_name = exam.name if exam else ""
    for sid in student_ids:
        links = db.query(ParentStudentLink).filter(ParentStudentLink.student_id == sid).all()
        for link in links:
            parent = db.query(Parent).filter(Parent.id == link.parent_id, Parent.user_id != None).first()
            if parent:
                send_notification(
                    db, parent.user_id, f"Grades Posted: {exam_name}",
                    f"Your child's results for {exam_name} have been posted. Check the parent portal.",
                    notification_type="exam_results",
                    reference_type="exam", reference_id=first_exam_id,
                )

    return created


def update_exam_result(db: Session, result_id: str, data, user_id: str, school_id: str):
    result = db.query(ExamResult).filter(ExamResult.id == result_id, ExamResult.school_id == school_id).first()
    if not result:
        raise NotFoundException("Exam result not found")
    if data.score is not None:
        result.score = data.score
    if data.remarks is not None:
        result.remarks = data.remarks
    log_audit(db, user_id, "UPDATE", "exam_result", result_id, "Exam result updated", school_id=school_id)
    db.commit()
    db.refresh(result)
    return result


def get_exam_results(db: Session, school_id: str, exam_id: str, include_deleted: bool = False):
    q = db.query(ExamResult).filter(ExamResult.school_id == school_id, ExamResult.exam_id == exam_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def promote_student(db: Session, school_id: str, student_id: str, to_class_id: str, academic_year_id: str, user_id: str):
    student = db.query(StudentModel).filter(StudentModel.id == student_id, StudentModel.school_id == school_id).first()
    if not student:
        raise NotFoundException("Student not found")
    from_class_id = student.grade_id
    if not from_class_id:
        raise BadRequestException("Student has no current class")
    pr = PromotionRecord(student_id=student_id, from_class_id=from_class_id, to_class_id=to_class_id, academic_year_id=academic_year_id, promoted_by=user_id, school_id=school_id)
    student.grade_id = to_class_id
    db.add(pr)
    log_audit(db, user_id, "CREATE", "promotion", pr.id, f"Student {student_id} promoted from {from_class_id} to {to_class_id}", school_id=school_id)
    db.commit()
    db.refresh(pr)
    return pr


def get_promotion_history(db: Session, school_id: str, student_id: str):
    return db.query(PromotionRecord).filter(PromotionRecord.school_id == school_id, PromotionRecord.student_id == student_id).order_by(PromotionRecord.created_at.desc()).all()


def bulk_promote_students(db: Session, student_ids: list[str], to_class_id: str, academic_year_id: str, user_id: str, school_id: str):
    promoted = []
    for sid in student_ids:
        student = db.query(StudentModel).filter(StudentModel.id == sid, StudentModel.school_id == school_id).first()
        if not student:
            continue
        from_class_id = student.grade_id
        if not from_class_id:
            continue
        pr = PromotionRecord(student_id=sid, school_id=school_id, from_class_id=from_class_id, to_class_id=to_class_id, academic_year_id=academic_year_id, promoted_by=user_id)
        student.grade_id = to_class_id
        db.add(pr)
        promoted.append(pr)
    log_audit(db, user_id, "BULK_PROMOTE", "promotion", f"{len(promoted)} students", f"Promoted {len(promoted)} students to class {to_class_id}", school_id=school_id)
    db.commit()
    for pr in promoted:
        db.refresh(pr)
    return promoted
