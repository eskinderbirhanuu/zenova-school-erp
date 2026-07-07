from sqlalchemy.orm import Session
from app.models.notification_preference import NotificationPreference
from app.models.telegram_bot import SchoolTelegramBot
from app.models.parent import Parent
from app.models.parent_student_link import ParentStudentLink
from app.models.student import Student
from app.models.user import User
from app.services.communication_service import send_notification as send_inapp
from app.services.email_service import send_absence_notification_email
from app.services.telegram_bot_service import send_telegram_message
import logging
logger = logging.getLogger(__name__)


def notify_parents_of_absence(
    db: Session,
    student_id: str,
    date: str,
    school_id: str,
    school_name: str,
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return

    class_name = ""
    if student.grade_id:
        from app.models.class_ import ClassGrade
        cls = db.query(ClassGrade).filter(ClassGrade.id == student.grade_id).first()
        if cls:
            class_name = cls.name

    links = db.query(ParentStudentLink).filter(
        ParentStudentLink.student_id == student_id
    ).all()
    if not links:
        return

    bot = db.query(SchoolTelegramBot).filter(
        SchoolTelegramBot.school_id == school_id,
        SchoolTelegramBot.is_active == True,
    ).first()

    for link in links:
        parent = db.query(Parent).filter(Parent.id == link.parent_id).first()
        if not parent or not parent.user_id:
            continue

        user = db.query(User).filter(User.id == parent.user_id).first()
        if not user:
            continue

        pref = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user.id
        ).first()

        send_inapp(
            db, user.id,
            title="Absence Notification",
            message=f"{student.first_name} {student.last_name} ({class_name}) was absent on {date}.",
            notification_type="attendance",
            reference_type="attendance",
            reference_id=student_id,
        )

        if pref and pref.email_on and user.email:
            send_absence_notification_email(
                to_email=user.email,
                student_name=f"{student.first_name} {student.last_name}",
                class_name=class_name,
                date=date,
                school_name=school_name,
            )

        if pref and pref.telegram_on and pref.telegram_chat_id and bot:
            try:
                import asyncio
                asyncio.ensure_future(send_telegram_message(
                    bot.bot_token,
                    pref.telegram_chat_id,
                    f"Absence Notification\n\n"
                    f"{student.first_name} {student.last_name} ({class_name})\n"
                    f"was marked absent on {date}.\n\n"
                    f"Please contact the school if you have any questions.",
                ))
            except Exception:
                logger.warning("Telegram notification failed for student", exc_info=True)
