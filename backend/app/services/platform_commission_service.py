"""Platform Commission Service — records fees, generates monthly invoices, handles payment."""
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.school import School
from app.models.payment import Payment
from app.models.school_transaction import SchoolTransaction
from app.models.platform_fee import PlatformFee
from app.models.monthly_platform_invoice import MonthlyPlatformInvoice
from app.models.number_sequence import NumberSequence
from app.core.audit import log_audit

PLATFORM_FEE_PER_TRANSACTION = Decimal("5.00")


class PlatformCommissionError(Exception):
    pass


def _next_invoice_number(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    seq = db.query(NumberSequence).filter(
        NumberSequence.prefix == "PINV",
        NumberSequence.year == year,
    ).with_for_update().first()
    if not seq:
        seq = NumberSequence(prefix="PINV", school_id="system", year=year, last_number=0)
        db.add(seq)
        db.flush()
    seq.last_number += 1
    db.flush()
    return f"PINV-{year}-{seq.last_number:05d}"


def record_transaction(
    db: Session,
    school_id: str,
    amount: Decimal,
    payment_method: str,
    payment_id: Optional[str] = None,
    student_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    transaction_reference: Optional[str] = None,
) -> SchoolTransaction:
    txn = SchoolTransaction(
        id=str(uuid.uuid4()),
        school_id=school_id,
        student_id=student_id,
        invoice_id=invoice_id,
        payment_id=payment_id,
        payment_method=payment_method,
        amount=amount,
        transaction_reference=transaction_reference,
        payment_date=datetime.now(timezone.utc),
    )
    db.add(txn)
    db.flush()
    return txn


def record_platform_fee(db: Session, txn: SchoolTransaction) -> PlatformFee:
    existing = db.query(PlatformFee).filter(
        PlatformFee.transaction_id == txn.id
    ).first()
    if existing:
        raise PlatformCommissionError("Fee already recorded for this transaction")

    fee = PlatformFee(
        id=str(uuid.uuid4()),
        school_id=txn.school_id,
        transaction_id=txn.id,
        fee_amount=PLATFORM_FEE_PER_TRANSACTION,
        status="pending",
        month=txn.payment_date.month,
        year=txn.payment_date.year,
    )
    db.add(fee)
    db.flush()
    return fee


def generate_monthly_invoice(db: Session, school_id: str, month: int, year: int) -> MonthlyPlatformInvoice:
    existing = db.query(MonthlyPlatformInvoice).filter(
        MonthlyPlatformInvoice.school_id == school_id,
        MonthlyPlatformInvoice.month == month,
        MonthlyPlatformInvoice.year == year,
    ).first()
    if existing:
        raise PlatformCommissionError(f"Invoice already exists for {month}/{year}")

    fees = db.query(PlatformFee).filter(
        PlatformFee.school_id == school_id,
        PlatformFee.month == month,
        PlatformFee.year == year,
        PlatformFee.status == "pending",
    ).all()

    if not fees:
        raise PlatformCommissionError("No pending fees for this period")

    count = len(fees)
    total = sum(f.fee_amount for f in fees)

    inv = MonthlyPlatformInvoice(
        id=str(uuid.uuid4()),
        school_id=school_id,
        month=month,
        year=year,
        transaction_count=count,
        total_amount=total,
        status="pending",
        invoice_number=_next_invoice_number(db),
    )
    db.add(inv)
    db.flush()

    for f in fees:
        f.status = "invoiced"
    db.flush()

    return inv


def mark_invoice_paid(
    db: Session,
    invoice_id: str,
    payment_reference: str,
    user_id: str,
) -> MonthlyPlatformInvoice:
    inv = db.query(MonthlyPlatformInvoice).filter(MonthlyPlatformInvoice.id == invoice_id).first()
    if not inv:
        raise PlatformCommissionError("Invoice not found")
    if inv.status == "paid":
        raise PlatformCommissionError("Invoice already paid")

    inv.status = "paid"
    inv.payment_reference = payment_reference
    inv.paid_at = datetime.now(timezone.utc)

    fees = db.query(PlatformFee).filter(
        PlatformFee.school_id == inv.school_id,
        PlatformFee.month == inv.month,
        PlatformFee.year == inv.year,
        PlatformFee.status == "invoiced",
    ).all()
    for f in fees:
        f.status = "paid"
        f.paid_at = datetime.now(timezone.utc)

    db.flush()

    log_audit(
        db, user_id, "PLATFORM_INVOICE_PAID",
        "monthly_platform_invoices", inv.id,
        f"Invoice {inv.invoice_number} paid: {inv.total_amount} ETB, {inv.transaction_count} transactions"
    )
    return inv


def get_school_dashboard(db: Session, school_id: str) -> Dict:
    now = datetime.now(timezone.utc)
    month, year = now.month, now.year

    txn_count = db.query(func.count(SchoolTransaction.id)).filter(
        SchoolTransaction.school_id == school_id,
        func.extract("month", SchoolTransaction.payment_date) == month,
        func.extract("year", SchoolTransaction.payment_date) == year,
    ).scalar() or 0

    pending_fees = db.query(func.count(PlatformFee.id)).filter(
        PlatformFee.school_id == school_id,
        PlatformFee.month == month,
        PlatformFee.year == year,
        PlatformFee.status.in_(["pending", "invoiced"]),
    ).scalar() or 0

    current_invoice = db.query(MonthlyPlatformInvoice).filter(
        MonthlyPlatformInvoice.school_id == school_id,
        MonthlyPlatformInvoice.month == month,
        MonthlyPlatformInvoice.year == year,
    ).first()

    invoice_history = db.query(MonthlyPlatformInvoice).filter(
        MonthlyPlatformInvoice.school_id == school_id,
    ).order_by(MonthlyPlatformInvoice.year.desc(), MonthlyPlatformInvoice.month.desc()).limit(12).all()

    return {
        "current_month": month,
        "current_year": year,
        "transactions_this_month": txn_count,
        "platform_fee_per_transaction": float(PLATFORM_FEE_PER_TRANSACTION),
        "pending_fees": pending_fees,
        "total_due": float(current_invoice.total_amount) if current_invoice and current_invoice.status == "pending" else 0.0,
        "current_invoice": {
            "id": current_invoice.id,
            "invoice_number": current_invoice.invoice_number,
            "transaction_count": current_invoice.transaction_count,
            "total_amount": float(current_invoice.total_amount),
            "status": current_invoice.status,
            "created_at": current_invoice.created_at.isoformat(),
        } if current_invoice else None,
        "invoice_history": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "month": inv.month,
                "year": inv.year,
                "transaction_count": inv.transaction_count,
                "total_amount": float(inv.total_amount),
                "status": inv.status,
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            }
            for inv in invoice_history
        ],
    }


def get_super_admin_dashboard(db: Session) -> Dict:
    now = datetime.now(timezone.utc)
    month, year = now.month, now.year

    total_txns = db.query(func.count(SchoolTransaction.id)).filter(
        func.extract("month", SchoolTransaction.payment_date) == month,
        func.extract("year", SchoolTransaction.payment_date) == year,
    ).scalar() or 0

    pending_total = db.query(func.coalesce(func.sum(PlatformFee.fee_amount), 0)).filter(
        PlatformFee.status == "pending",
        PlatformFee.month == month,
        PlatformFee.year == year,
    ).scalar() or Decimal("0")

    invoiced_total = db.query(func.coalesce(func.sum(PlatformFee.fee_amount), 0)).filter(
        PlatformFee.status == "invoiced",
        PlatformFee.month == month,
        PlatformFee.year == year,
    ).scalar() or Decimal("0")

    paid_total = db.query(func.coalesce(func.sum(PlatformFee.fee_amount), 0)).filter(
        PlatformFee.status == "paid",
        PlatformFee.month == month,
        PlatformFee.year == year,
    ).scalar() or Decimal("0")

    schools = db.query(School).filter(School.is_active == True).all()
    revenue_data = []
    for school in schools:
        school_txns = db.query(func.count(SchoolTransaction.id)).filter(
            SchoolTransaction.school_id == school.id,
            func.extract("month", SchoolTransaction.payment_date) == month,
            func.extract("year", SchoolTransaction.payment_date) == year,
        ).scalar() or 0
        school_paid = db.query(func.coalesce(func.sum(PlatformFee.fee_amount), 0)).filter(
            PlatformFee.school_id == school.id,
            PlatformFee.month == month,
            PlatformFee.year == year,
            PlatformFee.status == "paid",
        ).scalar() or Decimal("0")
        revenue_data.append({
            "school_id": school.id,
            "school_name": school.name,
            "transactions": school_txns,
            "revenue": float(school_paid),
        })

    revenue_data.sort(key=lambda r: r["revenue"], reverse=True)

    return {
        "month": month,
        "year": year,
        "total_transactions": total_txns,
        "pending_fees": float(pending_total),
        "invoiced_fees": float(invoiced_total),
        "paid_fees": float(paid_total),
        "total_revenue": float(pending_total + invoiced_total + paid_total),
        "school_rankings": revenue_data,
    }


def run_daily_fee_calculation(db: Session) -> int:
    today = date.today()
    payments = db.query(Payment).filter(
        func.date(Payment.payment_date) == today,
        Payment.deleted_at.is_(None),
    ).all()

    count = 0
    for payment in payments:
        existing_txn = db.query(SchoolTransaction).filter(
            SchoolTransaction.payment_id == payment.id
        ).first()
        if existing_txn:
            continue

        txn = record_transaction(
            db=db,
            school_id=payment.school_id,
            amount=payment.amount,
            payment_method=payment.payment_method,
            payment_id=payment.id,
            student_id=payment.student_id,
            invoice_id=payment.invoice_id,
            transaction_reference=payment.reference,
        )
        record_platform_fee(db, txn)
        count += 1

    if count:
        db.commit()
    return count


def run_monthly_invoice_generation(db: Session) -> List[str]:
    now = datetime.now(timezone.utc)
    prev_month = now.month - 1 or 12
    prev_year = now.year if now.month > 1 else now.year - 1

    school_ids = [
        row[0] for row in db.query(SchoolTransaction.school_id).filter(
            func.extract("month", SchoolTransaction.payment_date) == prev_month,
            func.extract("year", SchoolTransaction.payment_date) == prev_year,
        ).distinct().all()
    ]

    invoices = []
    for school_id in school_ids:
        try:
            inv = generate_monthly_invoice(db, school_id, prev_month, prev_year)
            invoices.append(inv.invoice_number)
        except PlatformCommissionError:
            continue

    if invoices:
        db.commit()
    return invoices
