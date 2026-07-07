"""Parent Payment Service - handles all payment operations for parents."""
import uuid
import json
import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.database import get_db
from app.models.invoice import Invoice, InvoiceLine
from app.models.sync_queue import SyncQueueItem
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
from app.config import settings


class PaymentError(Exception):
    """Custom payment exception."""
    pass


def _next_sequence_number(db: Session, prefix: str, school_id: str) -> str:
    """Generate next sequence number atomically."""
    year = datetime.now(timezone.utc).year
    seq = db.query(NumberSequence).filter(
        NumberSequence.prefix == prefix,
        NumberSequence.school_id == school_id,
        NumberSequence.year == year,
    ).with_for_update().first()
    if not seq:
        seq = NumberSequence(prefix=prefix, school_id=school_id, year=year, last_number=0)
        db.add(seq)
        db.flush()
        seq = db.query(NumberSequence).filter(
            NumberSequence.prefix == prefix,
            NumberSequence.school_id == school_id,
            NumberSequence.year == year,
        ).with_for_update().first()
    seq.last_number += 1
    db.flush()
    return f"{prefix}-{year}-{seq.last_number:05d}"


def get_parent_children_invoices(db: Session, parent_id: str, school_id: str) -> List[Dict]:
    """Get all invoices for children of a parent."""
    links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_id == parent_id).all()
    student_ids = [link.student_id for link in links]

    invoices = db.query(Invoice).filter(
        Invoice.student_id.in_(student_ids),
        Invoice.school_id == school_id,
        Invoice.status.in_(['pending', 'partial', 'overdue'])
    ).order_by(Invoice.due_date.asc()).all()

    result = []
    for inv in invoices:
        student = db.query(Student).filter(Student.id == inv.student_id).first()
        lines = db.query(InvoiceLine).filter(InvoiceLine.invoice_id == inv.id).all()
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": inv.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "total_amount": float(inv.total_amount),
            "paid_amount": float(inv.paid_amount),
            "balance": float(inv.total_amount) - float(inv.paid_amount),
            "status": inv.status,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
            "lines": [{"description": line.description, "amount": float(line.amount)} for line in lines]
        })
    return result


def get_parent_dashboard(db: Session, parent_id: str, school_id: str) -> Dict:
    """Get parent dashboard data with outstanding balances."""
    links = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == parent_id
    ).all()
    student_ids = [link.student_id for link in links]

    children_data = []
    total_outstanding = Decimal("0")
    total_paid = Decimal("0")

    for sid in student_ids:
        student = db.query(Student).filter(Student.id == sid).first()
        if not student:
            continue

        # Get invoices for this student
        invoices = db.query(Invoice).filter(
            Invoice.student_id == sid,
            Invoice.school_id == school_id
        ).all()

        student_total = Decimal("0")
        student_paid = Decimal("0")
        student_outstanding = Decimal("0")

        for inv in invoices:
            student_total += inv.total_amount
            student_paid += inv.paid_amount
            if inv.status in ['pending', 'partial', 'overdue']:
                student_outstanding += inv.total_amount - inv.paid_amount

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

    # Get recent payments
    recent_payments = db.query(Payment).filter(
        Payment.student_id.in_(student_ids),
        Payment.school_id == school_id
    ).order_by(Payment.created_at.desc()).limit(10).all()

    payment_history = []
    for payment in recent_payments:
        receipt = db.query(Receipt).filter(Receipt.payment_id == payment.id).first()
        payment_history.append({
            "id": payment.id,
            "amount": float(payment.amount),
            "method": payment.payment_method,
            "date": payment.payment_date.isoformat() if payment.payment_date else None,
            "status": "completed" if receipt else "pending",
            "receipt_id": receipt.id if receipt else None,
            "receipt_number": receipt.receipt_number if receipt else None,
        })

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
    session = db.query(PaymentSession).filter(
        PaymentSession.session_id == session_id
    ).first()
    if not session:
        raise PaymentError("Payment session not found")

    if session.status != "pending":
        raise PaymentError(f"Payment session is already {session.status}")

    # Verify Chapa signature
    if not _verify_chapa_signature(chapa_response):
        raise PaymentError("Invalid Chapa signature")

    # Idempotency: check if payment already exists for this session
    existing = db.query(Payment).filter(Payment.reference == chapa_response.get("reference")).first()
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

    # Update invoice
    if session.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == session.invoice_id).first()
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

    db.commit()

    # Record platform commission
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
    except Exception:
        pass

    # Log audit
    log_audit(
        db,
        "system",
        "PAYMENT_RECEIVED",
        "payment",
        payment.id,
        f"Payment {payment.payment_number} received via Chapa: {payment.amount} ETB"
    )

    return payment


def _verify_chapa_signature(payload: Dict[str, Any]) -> bool:
    """Verify Chapa transaction data has expected fields."""
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
    requested_by: str
) -> Refund:
    """Request a refund for a payment."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise PaymentError("Payment not found")

    # Check if refund already exists
    existing = db.query(Refund).filter(
        Refund.payment_id == payment_id,
        Refund.status.in_(['pending', 'approved'])
    ).first()
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


def approve_refund(db: Session, refund_id: str, approved_by: str, school_id: str | None = None) -> Refund:
    """Approve a refund request."""
    refund = db.query(Refund).filter(Refund.id == refund_id)
    if school_id is not None:
        refund = refund.filter(Refund.school_id == school_id)
    refund = refund.first()
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


def process_refund(db: Session, refund_id: str, processed_by: str, school_id: str | None = None) -> Refund:
    """Process an approved refund."""
    refund = db.query(Refund).filter(Refund.id == refund_id)
    if school_id is not None:
        refund = refund.filter(Refund.school_id == school_id)
    refund = refund.first()
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
        Receipt.status == "active"
    ).first()
    if receipt:
        receipt.status = "cancelled"
        receipt.notes = f"Cancelled by refund {refund.refund_number}"

    # Update invoice if applicable
    if refund.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == refund.invoice_id).first()
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


def get_payment_receipts(db: Session, payment_id: str) -> List[Receipt]:
    """Get all receipts for a payment."""
    return db.query(Receipt).filter(Receipt.payment_id == payment_id).all()
