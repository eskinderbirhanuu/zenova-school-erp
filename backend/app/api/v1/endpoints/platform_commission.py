"""Platform Commission API Endpoints — director dashboard, super admin dashboard, invoice payment."""
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.school import School
from app.models.platform_fee import PlatformFee
from app.models.monthly_platform_invoice import MonthlyPlatformInvoice
from app.models.school_transaction import SchoolTransaction
from app.services.platform_commission_service import (
    get_school_dashboard,
    get_super_admin_dashboard,
    mark_invoice_paid,
    PlatformCommissionError,
    PLATFORM_FEE_PER_TRANSACTION,
)
from app.services.chapa_service import (
    initialize_payment as chapa_initialize,
    verify_transaction as chapa_verify,
    verify_webhook_signature,
    ChapaError,
)
from app.core.audit import log_audit
from app.core.permissions import require_permission, Permission
from app.config import settings
from fastapi import Request

router = APIRouter(tags=["platform-commission"])


@router.get("/platform/dashboard")
def platform_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Director dashboard — current month fees, invoice, history."""
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")
    return get_school_dashboard(db, current_user.school_id)


@router.get("/platform/admin/dashboard")
def platform_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.AUDIT_VIEW),
):
    """Super admin dashboard — platform revenue overview."""
    return get_super_admin_dashboard(db)


@router.post("/platform/invoice/{invoice_id}/pay")
def pay_platform_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initialize Chapa payment for a platform invoice."""
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")

    inv = db.query(MonthlyPlatformInvoice).filter(
        MonthlyPlatformInvoice.id == invoice_id,
        MonthlyPlatformInvoice.school_id == current_user.school_id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == "paid":
        raise HTTPException(status_code=400, detail="Invoice already paid")

    school = db.query(School).filter(School.id == current_user.school_id).first()

    try:
        chapa_response = chapa_initialize(
            amount=float(inv.total_amount),
            currency="ETB",
            email=current_user.email or "platform@zenova.com",
            first_name=school.name if school else "School",
            last_name="Platform Fee",
            tx_ref=f"PINV-{inv.invoice_number}",
            callback_url=f"{settings.base_url}/api/v1/platform/invoice/webhook",
            return_url=f"{settings.base_url}/platform/invoice/success?invoice={inv.invoice_number}",
            description=f"Platform fee invoice {inv.invoice_number}",
            db=db,
            school_id=current_user.school_id,
        )
        return {
            "checkout_url": chapa_response.get("data", {}).get("checkout_url"),
            "reference": chapa_response.get("data", {}).get("reference"),
            "invoice_number": inv.invoice_number,
            "amount": float(inv.total_amount),
        }
    except ChapaError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/platform/invoice/webhook")
async def platform_invoice_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """Handle Chapa webhook for platform invoice payments."""
    signature = request.headers.get("X-Chapa-Signature", "")
    payload = await request.body()

    if not verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        data = await request.json()
        tx_ref = data.get("tx_ref", "")
        status = data.get("status")

        if status == "success" and tx_ref.startswith("PINV-"):
            invoice_number = tx_ref.replace("PINV-", "")
            inv = db.query(MonthlyPlatformInvoice).filter(
                MonthlyPlatformInvoice.invoice_number == invoice_number,
            ).first()
            if inv and inv.status != "paid":
                mark_invoice_paid(db, inv.id, data.get("reference", ""), "system")
                db.commit()
            return {"status": "success"}

        return {"status": "ignored"}
    except Exception:
        logger.exception("Platform invoice webhook processing failed")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/platform/reports/daily")
def daily_revenue_report(
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily platform revenue report."""
    from datetime import date as dt_date, datetime
    target = dt_date.fromisoformat(date_str) if date_str else dt_date.today()

    fees = db.query(PlatformFee).filter(
        func.date(PlatformFee.created_at) == target,
    ).all()

    total = sum(f.fee_amount for f in fees)
    return {
        "date": target.isoformat(),
        "total_fees": float(total),
        "pending": sum(1 for f in fees if f.status == "pending"),
        "paid": sum(1 for f in fees if f.status == "paid"),
        "invoiced": sum(1 for f in fees if f.status == "invoiced"),
        "count": len(fees),
    }


@router.get("/platform/reports/monthly")
def monthly_revenue_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Monthly platform revenue report."""
    from datetime import datetime
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    invoices = db.query(MonthlyPlatformInvoice).filter(
        MonthlyPlatformInvoice.month == m,
        MonthlyPlatformInvoice.year == y,
    ).all()

    total_invoiced = sum(inv.total_amount for inv in invoices)
    total_paid = sum(inv.total_amount for inv in invoices if inv.status == "paid")
    total_transactions = sum(inv.transaction_count for inv in invoices)

    return {
        "month": m,
        "year": y,
        "total_transactions": total_transactions,
        "total_invoiced": float(total_invoiced),
        "total_paid": float(total_paid),
        "total_pending": float(total_invoiced - total_paid),
        "schools_invoiced": len(invoices),
    }


@router.get("/platform/reports/schools")
def school_revenue_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-school revenue breakdown."""
    from datetime import datetime
    now = datetime.now(timezone.utc)

    schools = db.query(School).filter(School.is_active == True).all()
    school_ids = [s.id for s in schools]

    # Batch-load platform fees to avoid N+1 queries
    all_fees = db.query(PlatformFee).filter(
        PlatformFee.school_id.in_(school_ids),
    ).all() if school_ids else []

    # Group fees by school_id
    fees_by_school = {}
    for f in all_fees:
        fees_by_school.setdefault(f.school_id, []).append(f)

    results = []
    for school in schools:
        fees = fees_by_school.get(school.id, [])
        total_fees = sum(f.fee_amount for f in fees)
        paid_fees = sum(f.fee_amount for f in fees if f.status == "paid")
        results.append({
            "school_id": school.id,
            "school_name": school.name,
            "total_fees": float(total_fees),
            "paid_fees": float(paid_fees),
            "pending_fees": float(total_fees - paid_fees),
            "transaction_count": len(fees),
        })

    return results
