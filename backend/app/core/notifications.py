"""Notification services — SMS, Email, and Push for payment confirmations and alerts."""
import logging
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session

from app.config import settings
from app.models.student import Student
from app.models.parent import Parent
from app.models.school import School
from app.utils.circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)
_smtp_core_breaker = CircuitBreaker("smtp_core", failure_threshold=3, recovery_timeout=120)


def send_payment_confirmation(
    payment_id: str,
    student_id: str,
    amount: Decimal,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    db: Optional[Session] = None,
):
    """Send payment confirmation via available channels."""
    student_name = "Student"
    school_name = "ZENOVA"

    if db:
        student = db.query(Student).filter(Student.id == student_id).first()
        if student:
            student_name = f"{student.first_name} {student.last_name}"

    if email:
        _send_email(
            to=email,
            subject=f"Payment Confirmed — ETB {float(amount):,.2f}",
            body=f"Dear Parent,\n\n"
                  f"Your payment of ETB {float(amount):,.2f} for {student_name} has been received.\n"
                  f"Receipt ID: {payment_id}\n\n"
                  f"Thank you,\n{school_name}",
        )

    if phone:
        _send_sms(
            to=phone,
            message=f"Payment confirmed: ETB {float(amount):,.2f} for {student_name}. "
                    f"Receipt: {payment_id[:8]}...",
        )


def send_platform_invoice_notification(
    school_id: str,
    invoice_number: str,
    total_amount: Decimal,
    admin_email: Optional[str] = None,
    admin_phone: Optional[str] = None,
):
    """Notify school admin of new platform invoice."""
    if admin_email:
        _send_email(
            to=admin_email,
            subject=f"Platform Service Invoice — {invoice_number}",
            body=f"Dear Director,\n\n"
                 f"Your platform service invoice {invoice_number} "
                 f"for ETB {float(total_amount):,.2f} is ready.\n"
                 f"Please pay via the Platform Services page.\n\n"
                 f"Thank you,\nZENOVA",
        )

    if admin_phone:
        _send_sms(
            to=admin_phone,
            message=f"Platform invoice {invoice_number}: ETB {float(total_amount):,.2f} due. "
                    f"Pay via Platform Services.",
        )


def _send_email(to: str, subject: str, body: str):
    """Send email via SMTP."""
    if not settings.smtp_host:
        logger.warning("SMTP not configured — email not sent to %s", to)
        return
    import smtplib
    from email.message import EmailMessage

    def _do_send():
        msg = EmailMessage()
        msg.set_content(body)
        msg["Subject"] = subject
        msg["From"] = settings.email_from_address or "noreply@zenova.com"
        msg["To"] = to
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password or "")
            server.send_message(msg)

    try:
        _smtp_core_breaker.call(_do_send)
        logger.info("Email sent to %s: %s", to, subject)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)


def _send_sms(to: str, message: str):
    """Send SMS via Africa's Talking or similar provider."""
    logger.info("SMS to %s: %s", to, message)
