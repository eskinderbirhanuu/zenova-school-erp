import io
import qrcode
from sqlalchemy.orm import Session

from app.models.student_card import StudentCard
from app.models.staff_card import StaffCard
from app.models.parent_card import ParentCard
from app.models.employee_card import EmployeeCard


def generate_card_qr_png(card_uid: str) -> bytes:
    """Generate a QR code PNG image containing the card UID."""
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(card_uid)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


def resolve_card_type(card_uid: str, db: Session) -> str | None:
    """Check which table a card UID belongs to."""
    if db.query(StudentCard).filter(StudentCard.card_uid == card_uid).first():
        return "student"
    if db.query(StaffCard).filter(StaffCard.card_uid == card_uid).first():
        return "staff"
    if db.query(ParentCard).filter(ParentCard.card_uid == card_uid).first():
        return "parent"
    if db.query(EmployeeCard).filter(EmployeeCard.card_uid == card_uid).first():
        return "employee"
    return None
