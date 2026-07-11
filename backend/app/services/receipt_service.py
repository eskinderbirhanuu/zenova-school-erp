"""Receipt generation service for payment confirmations."""
import uuid
import io
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.models.receipt import Receipt, ReceiptLine
from app.models.payment import Payment
from app.models.invoice import Invoice, InvoiceLine
from app.models.student import Student
from app.models.parent import Parent
from app.models.school import School
from app.services.parent_payment_service import _next_sequence_number


def generate_receipt_number(db: Session, school_id: str) -> str:
    """Generate a unique receipt number."""
    return _next_sequence_number(db, "RCP", school_id)


def create_receipt_from_payment(
    db: Session,
    payment: Payment,
    student_id: str,
    parent_id: str,
    school_id: str,
    invoice_id: Optional[str] = None,
) -> Receipt:
    """Create a receipt from a payment record."""
    receipt_number = generate_receipt_number(db, school_id)

    receipt = Receipt(
        id=str(uuid.uuid4()),
        receipt_number=receipt_number,
        payment_id=payment.id,
        invoice_id=invoice_id,
        student_id=student_id,
        parent_id=parent_id,
        school_id=school_id,
        amount_paid=payment.amount,
        payment_method=payment.payment_method,
        payment_date=datetime.now(timezone.utc),
        transaction_id=payment.reference,
        status="active",
    )
    db.add(receipt)
    db.flush()

    # Add receipt lines from invoice lines
    if invoice_id:
        invoice_lines = db.query(InvoiceLine).filter(
            InvoiceLine.invoice_id == invoice_id
        ).all()
        for line in invoice_lines:
            receipt_line = ReceiptLine(
                id=str(uuid.uuid4()),
                receipt_id=receipt.id,
                invoice_line_id=line.id,
                description=line.description,
                amount=line.amount,
            )
            db.add(receipt_line)

    return receipt


def _build_receipt_styles():
    """Build named styles for the receipt PDF."""
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReceiptTitle", fontSize=20, leading=24, alignment=TA_CENTER, spaceAfter=6))
    styles.add(ParagraphStyle(name="ReceiptSubtitle", fontSize=10, leading=14, alignment=TA_CENTER, textColor=colors.gray))
    styles.add(ParagraphStyle(name="InfoLabel", fontSize=9, leading=13, textColor=colors.HexColor("#555555")))
    styles.add(ParagraphStyle(name="InfoValue", fontSize=10, leading=14, spaceAfter=4))
    styles.add(ParagraphStyle(name="TableHeader", fontSize=9, leading=12, textColor=colors.white, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name="TableCell", fontSize=9, leading=12, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name="TableAmount", fontSize=9, leading=12, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="TotalLabel", fontSize=12, leading=16, alignment=TA_RIGHT, spaceBefore=8))
    styles.add(ParagraphStyle(name="TotalAmount", fontSize=14, leading=18, alignment=TA_RIGHT, textColor=colors.HexColor("#1a56db")))
    styles.add(ParagraphStyle(name="Footer", fontSize=8, leading=10, alignment=TA_CENTER, textColor=colors.gray))
    return styles


def generate_receipt_pdf(db: Session, receipt_id: str, school_id: str | None = None) -> bytes:
    """Generate a PDF receipt using ReportLab."""
    q = db.query(Receipt).filter(Receipt.id == receipt_id)
    if school_id:
        q = q.filter(Receipt.school_id == school_id)
    receipt = q.first()
    if not receipt:
        raise ValueError("Receipt not found")

    payment = db.query(Payment).filter(Payment.id == receipt.payment_id).first()
    student = db.query(Student).filter(Student.id == receipt.student_id).first()
    parent = db.query(Parent).filter(Parent.id == receipt.parent_id).first()
    school = db.query(School).filter(School.id == receipt.school_id).first()
    lines = db.query(ReceiptLine).filter(ReceiptLine.receipt_id == receipt.id).all()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm)
    s = _build_receipt_styles()
    elements = []

    # Header
    school_name = school.name if school else "ZENOVA School"
    elements.append(Paragraph(school_name, s["ReceiptTitle"]))
    if school and school.address:
        elements.append(Paragraph(school.address, s["ReceiptSubtitle"]))
    if school and school.phone:
        elements.append(Paragraph(f"Tel: {school.phone}", s["ReceiptSubtitle"]))
    elements.append(Spacer(1, 4*mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1a56db")))
    elements.append(Spacer(1, 4*mm))

    # Receipt header info
    receipt_data = [
        [Paragraph("RECEIPT", s["ReceiptTitle"])],
        [Paragraph(f"Receipt #{receipt.receipt_number}", s["InfoValue"])],
    ]
    elements.append(Table(receipt_data, colWidths=[160*mm]))
    elements.append(Spacer(1, 3*mm))

    # Info blocks
    info_left = [
        [Paragraph("Student:", s["InfoLabel"]), Paragraph(f"{student.first_name} {student.last_name}" if student else "N/A", s["InfoValue"])],
        [Paragraph("Student ID:", s["InfoLabel"]), Paragraph(student.student_id if student else "N/A", s["InfoValue"])],
        [Paragraph("Parent:", s["InfoLabel"]), Paragraph(parent.full_name if parent else "N/A", s["InfoValue"])],
    ]
    info_right = [
        [Paragraph("Date:", s["InfoLabel"]), Paragraph(receipt.payment_date.strftime("%Y-%m-%d %H:%M"), s["InfoValue"])],
        [Paragraph("Method:", s["InfoLabel"]), Paragraph(receipt.payment_method.upper(), s["InfoValue"])],
        [Paragraph("Transaction:", s["InfoLabel"]), Paragraph(receipt.transaction_id or "N/A", s["InfoValue"])],
    ]
    info_table = Table(
        [[Table(info_left, colWidths=[35*mm, 45*mm]), Table(info_right, colWidths=[35*mm, 45*mm])]],
        colWidths=[80*mm, 80*mm]
    )
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))

    # Items table
    if lines:
        header = [Paragraph("Description", s["TableHeader"]), Paragraph("Amount (ETB)", s["TableHeader"])]
        table_data = [header]
        for line in lines:
            table_data.append([
                Paragraph(line.description, s["TableCell"]),
                Paragraph(f"{float(line.amount):,.2f}", s["TableAmount"]),
            ])

        # Total row
        separator = ["", ""]
        table_data.append(separator)
        table_data.append([
            Paragraph("Total Paid", s["TotalLabel"]),
            Paragraph(f"ETB {float(receipt.amount_paid):,.2f}", s["TotalAmount"]),
        ])

        items_table = Table(table_data, colWidths=[120*mm, 40*mm])
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, len(table_data) - 3), 0.5, colors.HexColor("#e5e7eb")),
            ("LINEBELOW", (0, len(table_data) - 2), (-1, len(table_data) - 2), 0.5, colors.HexColor("#e5e7eb")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(items_table)

    elements.append(Spacer(1, 10*mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph("Thank you for your payment!", s["Footer"]))
    elements.append(Paragraph(f"Receipt {receipt.receipt_number} | {school_name}", s["Footer"]))

    doc.build(elements)
    return buf.getvalue()


def get_receipt_details(db: Session, receipt_id: str, school_id: str | None = None) -> dict:
    """Get detailed receipt information."""
    q = db.query(Receipt).filter(Receipt.id == receipt_id)
    if school_id:
        q = q.filter(Receipt.school_id == school_id)
    receipt = q.first()
    if not receipt:
        raise ValueError("Receipt not found")

    payment = db.query(Payment).filter(Payment.id == receipt.payment_id).first()
    student = db.query(Student).filter(Student.id == receipt.student_id).first()
    parent = db.query(Parent).filter(Parent.id == receipt.parent_id).first()
    lines = db.query(ReceiptLine).filter(ReceiptLine.receipt_id == receipt.id).all()

    return {
        "id": receipt.id,
        "receipt_number": receipt.receipt_number,
        "student_name": f"{student.first_name} {student.last_name}" if student else "",
        "student_id": student.student_id if student else "",
        "parent_name": parent.full_name if parent else "",
        "amount_paid": float(receipt.amount_paid),
        "payment_method": receipt.payment_method,
        "payment_date": receipt.payment_date.isoformat(),
        "transaction_id": receipt.transaction_id,
        "status": receipt.status,
        "lines": [
            {
                "description": line.description,
                "amount": float(line.amount),
            }
            for line in lines
        ],
    }


def cancel_receipt(db: Session, receipt_id: str, reason: str, cancelled_by: str, school_id: str | None = None) -> Receipt:
    """Cancel a receipt (for refunds or corrections)."""
    q = db.query(Receipt).filter(Receipt.id == receipt_id)
    if school_id:
        q = q.filter(Receipt.school_id == school_id)
    receipt = q.first()
    if not receipt:
        raise ValueError("Receipt not found")

    if receipt.status == "cancelled":
        raise ValueError("Receipt is already cancelled")

    receipt.status = "cancelled"
    receipt.notes = f"Cancelled by {cancelled_by}: {reason}"
    db.commit()
    db.refresh(receipt)

    return receipt


def email_receipt_pdf(db: Session, receipt_id: str, recipient_email: str, school_id: str | None = None) -> bool:
    """Generate PDF receipt and send via email."""
    try:
        pdf_bytes = generate_receipt_pdf(db, receipt_id, school_id=school_id)
        q = db.query(Receipt).filter(Receipt.id == receipt_id)
        if school_id:
            q = q.filter(Receipt.school_id == school_id)
        receipt = q.first()
        if not receipt:
            return False

        from app.core.notifications import _send_email
        _send_email(
            to=recipient_email,
            subject=f"Payment Receipt — {receipt.receipt_number}",
            body=f"Dear Parent,\n\nPlease find attached your payment receipt "
                 f"{receipt.receipt_number} for ETB {float(receipt.amount_paid):,.2f}.\n\n"
                 f"Thank you,\nZENOVA",
        )
        return True
    except Exception:
        return False
