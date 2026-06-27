import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
) -> bool:
    if not settings.smtp_host:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.email_from_name} <{settings.email_from_address}>"
    msg["To"] = to_email

    msg.attach(MIMEText(body_text, "plain"))
    if body_html:
        msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.email_from_address, to_email, msg.as_string())
        return True
    except Exception:
        return False


def send_absence_notification_email(
    to_email: str,
    student_name: str,
    class_name: str,
    date: str,
    school_name: str,
) -> bool:
    subject = f"Attendance Notification — {school_name}"
    body_text = (
        f"Dear Parent,\n\n"
        f"Your child {student_name} ({class_name}) was marked absent on {date}.\n\n"
        f"If you have any questions, please contact the school.\n\n"
        f"Regards,\n{school_name}"
    )
    body_html = (
        f"<h2>Attendance Notification</h2>"
        f"<p>Dear Parent,</p>"
        f"<p>Your child <b>{student_name}</b> ({class_name}) "
        f"was marked <b>absent</b> on {date}.</p>"
        f"<p>If you have any questions, please contact the school.</p>"
        f"<p>Regards,<br/>{school_name}</p>"
    )
    return send_email(to_email, subject, body_text, body_html)
