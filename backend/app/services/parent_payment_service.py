"""Parent Payment Service - handles all payment operations for parents."""
import uuid
import json
import secrets
import hashlib
import hmac
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.invoice import Invoice, InvoiceLine
from app.models.payment import Payment
from app.models.receipt import Receipt, ReceiptLine
from app.models.payment_session import PaymentSession
from app.models.refund import Refund
from app.models.student import Student
from app.models.parent import Parent
from app.models.parent_student_link import ParentStudentLink
from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction
from app.models.journal import JournalEntry, JournalLine
from app.models.account import Account
from app.models.number_sequence import NumberSequence
from app.core.audit import log_audit
from app.core.exceptions import AppException
from app.core.error_codes import ErrorCode
from app.config import settings
from app.utils.sequence import next_sequence_number as _next_sequence_number


class PaymentError(AppException):
    """Custom payment exception."""
    def __init__(self, detail: str = "Payment error"):
        super().__init__(detail, status_code=502, code=ErrorCode.SERVICE_UNAVAILABLE)


def get_parent_children_invoices(db: Session, parent_id: str, school_id: str) -> List[Dict]:
    """Get all invoices for children of a parent."""
    links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_id == parent_id).all()
    student_ids = [link.student_id for link in links]

    invoices = db.query(Invoice).filter(
        Invoice.student_id.in_(student_ids),
        Invoice.school_id == school_id,
        Invoice.status.in_(['pending', 'partial', 'overdue'])
    ).order_by(Invoice.due_date.asc()).all()

    student_ids_from_invoices = {inv.student_id for inv in invoices}
    students = {
        s.id: s for s in db.query(Student).filter(
            Student.id.in_(student_ids_from_invoices), Student.school_id == school_id
        ).all()
    } if student_ids_from_invoices else {}

    invoice_ids = [inv.id for inv in invoices]
    lines_by_invoice: dict[str, list] = {}
    if invoice_ids:
        for line in db.query(InvoiceLine).filter(InvoiceLine.invoice_id.in_(invoice_ids)).all():
            lines_by_invoice.setdefault(line.invoice_id, []).append(line)

    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": inv.student_id,
            "student_name": students[inv.student_id].first_name + " " + students[inv.student_id].last_name
                if inv.student_id in students else "Unknown",
            "total_amount": float(inv.total_amount),
            "paid_amount": float(inv.paid_amount),
            "balance": float(inv.total_amount) - float(inv.paid_amount),
            "status": inv.status,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
            "lines": [{"description": line.description, "amount": float(line.amount)} for line in lines_by_invoice.get(inv.id, [])]
        }
        for inv in invoices
    ]


def get_parent_dashboard(db: Session, parent_id: str, school_id: str) -> Dict:
    """Get parent dashboard data with outstanding balances."""
    links = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == parent_id
    ).all()
    student_ids = [link.student_id for link in links]

    students = {
        s.id: s for s in db.query(Student).filter(
            Student.id.in_(student_ids), Student.school_id == school_id
        ).all()
    } if student_ids else {}

    invoices_by_student: dict[str, list] = {}
    if student_ids:
        for inv in db.query(Invoice).filter(
            Invoice.student_id.in_(student_ids), Invoice.school_id == school_id
        ).all():
            invoices_by_student.setdefault(inv.student_id, []).append(inv)

    children_data = []
    total_outstanding = Decimal("0")
    total_paid = Decimal("0")

    for sid, invoices in invoices_by_student.items():
        student = students.get(sid)
        if not student:
            continue

        student_total = sum(inv.total_amount for inv in invoices)
        student_paid = sum(inv.paid_amount for inv in invoices)
        student_outstanding = sum(
            inv.total_amount - inv.paid_amount
            for inv in invoices if inv.status in ['pending', 'partial', 'overdue']
        )

        total_outstanding += student_outstanding
        total_paid += student_paid

        children_data.append({
            "id": student.id,
            "name": f"{student.first_name} {student.last_name}",
            "student_id": student.student_id,
            "total_fees": float(student_total),
            "paid_amount": float(student_paid),
            "outstanding_balance": float(student_outstanding),
        })

    # Also include students with no invoices (still enrolled, no fees)
    for sid in student_ids:
        if sid not in invoices_by_student:
            student = students.get(sid)
            if student:
                children_data.append({
                    "id": student.id,
                    "name": f"{student.first_name} {student.last_name}",
                    "student_id": student.student_id,
                    "total_fees": 0.0,
                    "paid_amount": 0.0,
                    "outstanding_balance": 0.0,
                })

    # Get recent payments with batch receipt lookup
    recent_payments = db.query(Payment).filter(
        Payment.student_id.in_(student_ids),
        Payment.school_id == school_id
    ).order_by(Payment.created_at.desc()).limit(10).all()

    payment_ids = [p.id for p in recent_payments]
    receipts_by_payment = {
        r.payment_id: r for r in db.query(Receipt).filter(Receipt.payment_id.in_(payment_ids)).all()
    } if payment_ids else {}

    payment_history = [
        {
            "id": payment.id,
            "amount": float(payment.amount),
            "method": payment.payment_method,
            "date": payment.payment_date.isoformat() if payment.payment_date else None,
            "status": "completed" if payment.id in receipts_by_payment else "pending",
            "receipt_id": receipts_by_payment[payment.id].id if payment.id in receipts_by_payment else None,
            "receipt_number": receipts_by_payment[payment.id].receipt_number if payment.id in receipts_by_payment else None,
        }
        for payment in recent_payments
    ]

    return {
        "parent_id": parent_id,
        "total_outstanding": float(total_outstanding),
        "total_paid": float(total_paid),
        "children": children_data,
        "payment_history": payment_history,
        "recent_invoices": get_parent_children_invoices(db, parent_id, school_id)[:5],
    }


def create_payment_session(
    db: Session,
    parent_id: str,
    student_id: str,
    invoice_id: Optional[str],
    amount: Decimal,
    payment_method: str,
    school_id: str
) -> PaymentSession:
    """Create a new payment session for online payment."""
    # Validate parent-student relationship
    link = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == parent_id,
        ParentStudentLink.student_id == student_id
    ).first()
    if not link:
        raise PaymentError("Parent is not linked to this student")

    # Validate invoice if provided
    if invoice_id:
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.student_id == student_id,
            Invoice.school_id == school_id
        ).first()
        if not invoice:
            raise PaymentError("Invoice not found")
        if invoice.status == "paid":
            raise PaymentError("Invoice is already paid")
        balance = invoice.total_amount - invoice.paid_amount
        if amount > balance:
            raise PaymentError(f"Payment amount exceeds invoice balance of {balance}")

    # Generate unique session ID
    session_id = f"ZPS-{secrets.token_urlsafe(16)}"

    session = PaymentSession(
        id=str(uuid.uuid4()),
        session_id=session_id,
        invoice_id=invoice_id,
        student_id=student_id,
        parent_id=parent_id,
        school_id=school_id,
        amount=amount,
        currency="ETB",
        payment_method=payment_method,
        gateway=payment_method,  # LPesa, Chapa, etc.
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def process_chapa_payment(
    db: Session,
    session_id: str,
    chapa_response: Dict[str, Any]
) -> Payment:
    """Process Chapa payment callback."""
    # Concurrency safety: lock the payment session row so two concurrent
    # webhook callbacks cannot both see "pending" and create duplicate payments.
    session = db.query(PaymentSession).filter(
        PaymentSession.session_id == session_id
    ).with_for_update().first()
    if not session:
        raise PaymentError("Payment session not found")

    if session.status != "pending":
        raise PaymentError(f"Payment session is already {session.status}")

    # Validate Chapa response fields
    if not _validate_chapa_response(chapa_response):
        raise PaymentError("Invalid Chapa signature")

    # Idempotency: check if payment already exists for this Chapa reference
    existing = db.query(Payment).filter(
        Payment.reference == chapa_response.get("reference"),
        Payment.school_id == session.school_id
    ).with_for_update().first()
    if existing:
        raise PaymentError(f"Payment already processed: {existing.payment_number}")

    # Update session
    session.status = "completed"
    session.webhook_received = datetime.now(timezone.utc)
    session.webhook_payload = json.dumps(chapa_response)
    session.webhook_verified = datetime.now(timezone.utc)

    # Create payment record
    payment = Payment(
        id=str(uuid.uuid4()),
        payment_number=_next_sequence_number(db, "PAY", session.school_id),
        invoice_id=session.invoice_id,
        student_id=session.student_id,
        parent_id=session.parent_id,
        amount=session.amount,
        payment_method="chapa",
        reference=chapa_response.get("reference"),
        payment_date=datetime.now(timezone.utc).date(),
        school_id=session.school_id,
        received_by="system",  # Webhook is system-initiated
    )
    db.add(payment)
    db.flush()

    # Update invoice with concurrency lock
    if session.invoice_id:
        invoice = db.query(Invoice).filter(
            Invoice.id == session.invoice_id,
            Invoice.school_id == session.school_id
        ).with_for_update().first()
        if invoice:
            invoice.paid_amount += session.amount
            if invoice.paid_amount >= invoice.total_amount:
                invoice.status = "paid"
            else:
                invoice.status = "partial"

    # Create receipt
    receipt = _create_receipt(db, payment, session)

    # Create journal entry
    _create_payment_journal_entry(db, payment, session.school_id)

    # Record platform commission (log but don't fail the payment on error)
    try:
        from app.services.platform_commission_service import record_transaction, record_platform_fee
        txn = record_transaction(
            db=db,
            school_id=session.school_id,
            amount=payment.amount,
            payment_method=payment.payment_method,
            payment_id=payment.id,
            student_id=payment.student_id,
            invoice_id=payment.invoice_id,
            transaction_reference=payment.reference,
        )
        record_platform_fee(db, txn)
    except Exception as exc:
        logger.warning("Platform commission recording failed for payment %s: %s", payment.id, exc)

    db.commit()

    # Log audit
    log_audit(
        db,
        "system",
        "PAYMENT_RECEIVED",
        "payment",
        payment.id,
        f"Payment {payment.payment_number} received via Chapa: {payment.amount} ETB",
        school_id=payment.school_id,
    )

    return payment


def _validate_chapa_response(payload: Dict[str, Any]) -> bool:
    """Validate Chapa response has required fields and a known status (HMAC verified upstream)."""
    required = ["tx_ref", "status", "reference"]
    if not all(k in payload for k in required):
        return False
    if payload.get("status") not in ("success", "completed", "failed"):
        return False
    return True


def _create_receipt(db: Session, payment: Payment, session: PaymentSession) -> Receipt:
    """Generate receipt for a payment."""
    receipt_number = _next_sequence_number(db, "RCP", session.school_id)

    receipt = Receipt(
        id=str(uuid.uuid4()),
        receipt_number=receipt_number,
        payment_id=payment.id,
        invoice_id=session.invoice_id,
        student_id=session.student_id,
        parent_id=session.parent_id,
        school_id=session.school_id,
        amount_paid=payment.amount,
        payment_method=payment.payment_method,
        payment_date=datetime.now(timezone.utc),
        transaction_id=payment.reference,
        status="active",
    )
    db.add(receipt)
    db.flush()

    # Add receipt lines from invoice lines
    if session.invoice_id:
        invoice_lines = db.query(InvoiceLine).filter(
            InvoiceLine.invoice_id == session.invoice_id
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


def _create_payment_journal_entry(db: Session, payment: Payment, school_id: str):
    """Create journal entry for payment."""
    # Debit Cash/Bank
    cash_account = db.query(Account).filter(
        Account.school_id == school_id,
        Account.account_type == "asset",
        Account.name.ilike("%cash%")
    ).first()

    # Credit Student Receivable
    receivable_account = db.query(Account).filter(
        Account.school_id == school_id,
        Account.account_type == "asset",
        Account.name.ilike("%receivable%")
    ).first()

    if cash_account and receivable_account:
        entry = JournalEntry(
            id=str(uuid.uuid4()),
            entry_date=datetime.now(timezone.utc).date(),
            reference=payment.payment_number,
            description=f"Payment received: {payment.payment_number}",
            school_id=school_id,
            created_by="system",
        )
        db.add(entry)
        db.flush()

        # Debit Cash
        db.add(JournalLine(
            id=str(uuid.uuid4()),
            journal_entry_id=entry.id,
            account_id=cash_account.id,
            debit=payment.amount,
            credit=Decimal("0"),
            description="Cash/Bank",
        ))

        # Credit Receivable
        db.add(JournalLine(
            id=str(uuid.uuid4()),
            journal_entry_id=entry.id,
            account_id=receivable_account.id,
            debit=Decimal("0"),
            credit=payment.amount,
            description="Student Receivable",
        ))


def request_refund(
    db: Session,
    payment_id: str,
    amount: Decimal,
    reason: str,
    requested_by: str,
    school_id: str | None = None,
) -> Refund:
    """Request a refund for a payment."""
    # Concurrency safety: lock the payment row so two concurrent refund
    # requests cannot both pass the "existing refund" check.
    payment = db.query(Payment).filter(Payment.id == payment_id)
    if school_id is not None:
        payment = payment.filter(Payment.school_id == school_id)
    payment = payment.with_for_update().first()
    if not payment:
        raise PaymentError("Payment not found")

    # Check if refund already exists (locked row prevents race)
    existing = db.query(Refund).filter(
        Refund.payment_id == payment_id,
        Refund.status.in_(['pending', 'approved'])
    ).with_for_update().first()
    if existing:
        raise PaymentError("Refund already requested for this payment")

    refund = Refund(
        id=str(uuid.uuid4()),
        refund_number=_next_sequence_number(db, "RFD", payment.school_id),
        payment_id=payment_id,
        receipt_id=None,  # Will be set if receipt exists
        invoice_id=payment.invoice_id,
        student_id=payment.student_id,
        parent_id=payment.parent_id,
        school_id=payment.school_id,
        amount=amount,
        reason=reason,
        refund_method="original",
        status="pending",
        requested_by=requested_by,
    )
    db.add(refund)
    db.commit()
    db.refresh(refund)

    return refund


def approve_refund(db: Session, refund_id: str, approved_by: str, school_id: str) -> Refund:
    """Approve a refund request."""
    refund = db.query(Refund).filter(
        Refund.id == refund_id,
        Refund.school_id == school_id
    ).first()
    if not refund:
        raise PaymentError("Refund not found")
    if refund.status != "pending":
        raise PaymentError(f"Refund is already {refund.status}")

    refund.status = "approved"
    refund.approved_by = approved_by
    refund.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(refund)

    return refund


def process_refund(db: Session, refund_id: str, processed_by: str, school_id: str) -> Refund:
    """Process an approved refund."""
    refund = db.query(Refund).filter(
        Refund.id == refund_id,
        Refund.school_id == school_id
    ).first()
    if not refund:
        raise PaymentError("Refund not found")
    if refund.status != "approved":
        raise PaymentError("Refund must be approved before processing")

    refund.status = "processed"
    refund.processed_at = datetime.now(timezone.utc)
    refund.processed_by = processed_by

    # Cancel associated receipt
    receipt = db.query(Receipt).filter(
        Receipt.payment_id == refund.payment_id,
        Receipt.status == "active",
        Receipt.school_id == school_id
    ).first()
    if receipt:
        receipt.status = "cancelled"
        receipt.notes = f"Cancelled by refund {refund.refund_number}"

    # Update invoice if applicable
    if refund.invoice_id:
        invoice = db.query(Invoice).filter(
            Invoice.id == refund.invoice_id,
            Invoice.school_id == school_id
        ).first()
        if invoice:
            invoice.paid_amount -= refund.amount
            if invoice.paid_amount <= 0:
                invoice.status = "pending"
            else:
                invoice.status = "partial"

    db.commit()
    db.refresh(refund)

    return refund


def get_receipt_by_id(db: Session, receipt_id: str, parent_id: str) -> Optional[Receipt]:
    """Get receipt by ID, ensuring parent ownership."""
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id,
        Receipt.parent_id == parent_id
    ).first()
    return receipt


def get_payment_receipts(db: Session, payment_id: str, school_id: str) -> List[Receipt]:
    """Get all receipts for a payment."""
    return db.query(Receipt).filter(
        Receipt.payment_id == payment_id,
        Receipt.school_id == school_id
    ).all()
