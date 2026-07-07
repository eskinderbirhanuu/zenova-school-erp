import io
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from app.models.student_card import StudentCard
from app.models.staff_card import StaffCard
from app.models.parent_card import ParentCard
from app.models.employee_card import EmployeeCard
from app.models.student import Student
from app.models.staff_profile import StaffProfile
from app.models.parent import Parent
from app.models.user import User
from app.models.school import School
from app.models.card_design import CardDesign
from app.models.card_print_request import CardPrintRequest

CARD_W = 85 * mm
CARD_H = 54 * mm


def _load_logo(logo_url: str | None):
    if not logo_url:
        return None
    try:
        return ImageReader(logo_url)
    except Exception:
        return None


def _draw_zenova_watermark(c: canvas.Canvas, w: float, h: float):
    c.saveState()
    c.setFillColor(colors.Color(0, 0, 0, alpha=0.04))
    c.setFont("Helvetica-Bold", 28)
    c.translate(w / 2, h / 2)
    c.rotate(-15)
    c.drawCentredString(0, 0, "ZENOVA")
    c.restoreState()


def _draw_front(
    c: canvas.Canvas,
    school_name: str,
    full_name: str,
    ref_id: str,
    person_id: str,
    card_tier: str,
    logo: ImageReader | None,
):
    c.saveState()
    c.setFillColor(colors.white)
    c.rect(0, 0, CARD_W, CARD_H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1e293b"))

    tier_label = "DESFire EV2" if card_tier == "premium" else "MIFARE Classic 1K"
    tier_color = colors.HexColor("#f59e0b") if card_tier == "premium" else colors.HexColor("#3b82f6")

    _draw_zenova_watermark(c, CARD_W, CARD_H)

    # School logo area
    if logo:
        c.drawImage(logo, 10, CARD_H - 22, width=18, height=18, preserveAspectRatio=True)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(32, CARD_H - 12, school_name[:30])

    # Tier badge
    c.setFillColor(tier_color)
    c.setFont("Helvetica-Bold", 6)
    c.drawString(CARD_W - 40, CARD_H - 12, tier_label)

    c.setFillColor(colors.HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(10, CARD_H - 36, full_name[:28])

    c.setFont("Helvetica", 8)
    c.drawString(10, CARD_H - 48, ref_id)

    c.setFont("Helvetica", 7)
    c.drawString(10, CARD_H - 56, person_id[:30])

    # Branding
    c.setFillColor(colors.Color(0, 0, 0, alpha=0.3))
    c.setFont("Helvetica", 5)
    c.drawString(10, 3, "Powered By ZENOVA")
    c.drawString(CARD_W - 50, 3, tier_label)

    c.restoreState()


def _draw_back(
    c: canvas.Canvas,
    school_name: str,
    address: str,
    emergency: str,
    website: str,
    card_tier: str,
    logo: ImageReader | None,
):
    c.saveState()
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(0, 0, CARD_W, CARD_H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1e293b"))

    _draw_zenova_watermark(c, CARD_W, CARD_H)

    # QR placeholder
    c.setStrokeColor(colors.Color(0, 0, 0, alpha=0.2))
    c.setLineWidth(0.5)
    c.rect(CARD_W / 2 - 12, CARD_H / 2 - 12, 24, 24)
    c.setFont("Helvetica", 5)
    c.setFillColor(colors.Color(0, 0, 0, alpha=0.3))
    c.drawCentredString(CARD_W / 2, CARD_H / 2 - 2, "QR Code")

    c.setFillColor(colors.Color(0, 0, 0, alpha=0.5))
    c.setFont("Helvetica", 6)
    c.drawString(10, CARD_H - 22, f"{school_name}")
    c.drawString(10, CARD_H - 30, emergency)

    c.setFont("Helvetica", 5)
    c.drawString(10, CARD_H - 38, address)
    c.drawString(10, CARD_H - 44, website)

    # Footer
    c.setFillColor(colors.Color(0, 0, 0, alpha=0.25))
    c.setFont("Helvetica", 5)
    c.drawCentredString(CARD_W / 2, 3, "ZENOVA NFC Technology")

    c.restoreState()


def _get_person_info(db: Session, card_type: str, reference_id: str, school_id: str | None = None) -> dict | None:
    if card_type == "student":
        card = db.query(StudentCard).filter(StudentCard.student_id == reference_id).first()
        if not card:
            return None
        q = db.query(Student).filter(Student.id == reference_id)
        if school_id is not None:
            q = q.filter(Student.school_id == school_id)
        s = q.first()
        if not s:
            return None
        school = db.query(School).filter(School.id == s.school_id).first()
        return {
            "full_name": " ".join(filter(None, [s.first_name, s.middle_name, s.last_name])),
            "ref_id": s.student_id,
            "person_id": f"Grade: {s.grade_id or '-'} / Section: {s.section_id or '-'}",
            "school": school,
            "card_tier": card.card_tier,
        }
    elif card_type == "staff":
        card = db.query(StaffCard).filter(StaffCard.staff_profile_id == reference_id).first()
        if not card:
            return None
        q = db.query(StaffProfile).filter(StaffProfile.id == reference_id)
        if school_id is not None:
            q = q.filter(StaffProfile.school_id == school_id)
        sp = q.first()
        if not sp:
            return None
        u = db.query(User).filter(User.id == sp.user_id).first()
        school = db.query(School).filter(School.id == sp.school_id).first()
        return {
            "full_name": u.full_name if u else "Staff",
            "ref_id": sp.staff_id,
            "person_id": sp.department or "",
            "school": school,
            "card_tier": card.card_tier,
        }
    elif card_type == "parent":
        card = db.query(ParentCard).filter(ParentCard.parent_id == reference_id).first()
        if not card:
            return None
        q = db.query(Parent).filter(Parent.id == reference_id)
        if school_id is not None:
            q = q.filter(Parent.school_id == school_id)
        p = q.first()
        if not p:
            return None
        school = db.query(School).filter(School.id == p.school_id).first()
        return {
            "full_name": p.full_name,
            "ref_id": p.parent_id or "",
            "person_id": p.phone_1 or "",
            "school": school,
            "card_tier": card.card_tier,
        }
    elif card_type == "employee":
        card = db.query(EmployeeCard).filter(EmployeeCard.employee_id == reference_id).first()
        if not card:
            return None
        from app.models.corporate_employee import CorporateEmployee
        ce = db.query(CorporateEmployee).filter(CorporateEmployee.id == reference_id).first()
        if not ce:
            return None
        return {
            "full_name": ce.full_name,
            "ref_id": ce.employee_id,
            "person_id": ce.position or "",
            "school": None,
            "card_tier": card.card_tier,
        }
    return None


def generate_card_pdf(db: Session, card_type: str, reference_id: str, school_id: str | None = None) -> bytes | None:
    info = _get_person_info(db, card_type, reference_id, school_id)
    if not info:
        return None

    school = info["school"]
    school_name = school.name if school else "ZENOVA"
    address = school.address if school and school.address else "Addis Ababa, Ethiopia"
    emergency = f"Emergency: {school.phone}" if school and school.phone else "Emergency: +251-911-000000"
    website = school.website if school and school.website else "www.zenova.edu.et"

    design = None
    if school:
        design = db.query(CardDesign).filter(CardDesign.school_id == school.id).first()

    logo_url = design.logo_url if design and design.logo_url else (school.logo_url if school else None)
    logo = _load_logo(logo_url)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(CARD_W, CARD_H))

    # Front
    _draw_front(
        c, school_name, info["full_name"], info["ref_id"],
        info["person_id"], info["card_tier"], logo,
    )
    c.showPage()

    # Back
    _draw_back(c, school_name, address, emergency, website, info["card_tier"], logo)
    c.showPage()

    c.save()
    buf.seek(0)
    return buf.getvalue()
