"""Parent Payment API Endpoints."""
import json
import logging
from decimal import Decimal
from typing import Optional, List
logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.parent import Parent
from app.models.parent_student_link import ParentStudentLink
from app.models.student import Student
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.receipt import Receipt
from app.models.payment_session import PaymentSession
from app.models.refund import Refund
from app.services.parent_payment_service import (
    get_parent_dashboard,
    get_parent_children_invoices,
    create_payment_session,
    process_chapa_payment,
    request_refund,
    approve_refund,
    process_refund,
    get_receipt_by_id,
    PaymentError,
)
from app.core.payment_gateway import PaymentGatewayFactory, ChapaPaymentGateway
from app.services.receipt_service import generate_receipt_pdf
from app.core.audit import log_audit
from app.config import settings

router = APIRouter(tags=["parent-payments"])


@router.get("/parent-payments/dashboard")
def parent_payment_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get parent payment dashboard with outstanding balances."""
    if not current_user.parent_id:
        raise HTTPException(status_code=400, detail="User is not linked to a parent profile")

    parent = db.query(Parent).filter(Parent.id == current_user.parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    return get_parent_dashboard(db, parent.id, current_user.school_id)


@router.get("/parent-payments/invoices")
def parent_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all invoices for parent's children."""
    if not current_user.parent_id:
        raise HTTPException(status_code=400, detail="User is not linked to a parent profile")

    return get_parent_children_invoices(db, current_user.parent_id, current_user.school_id)


@router.post("/parent-payments/create-session")
def create_payment_session_endpoint(
    student_id: str,
    amount: Decimal,
    payment_method: str,
    invoice_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a payment session for online payment."""
    if not current_user.parent_id:
        raise HTTPException(status_code=400, detail="User is not linked to a parent profile")

    try:
        session = create_payment_session(
            db=db,
            parent_id=current_user.parent_id,
            student_id=student_id,
            invoice_id=invoice_id,
            amount=amount,
            payment_method=payment_method,
            school_id=current_user.school_id,
        )
        return {
            "session_id": session.session_id,
            "amount": session.amount,
            "currency": session.currency,
            "status": session.status,
            "expires_at": session.expires_at.isoformat(),
        }
    except PaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/parent-payments/chapa/initialize")
def initialize_chapa_payment(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initialize a payment session via the configured gateway."""
    session = db.query(PaymentSession).filter(
        PaymentSession.session_id == session_id,
        PaymentSession.parent_id == current_user.parent_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Payment session not found")

    if session.status != "pending":
        raise HTTPException(status_code=400, detail=f"Session is already {session.status}")

    student = db.query(Student).filter(Student.id == session.student_id).first()
    parent = db.query(Parent).filter(Parent.id == session.parent_id).first()

    gateway = PaymentGatewayFactory.get_gateway(
        "chapa", db=db, school_id=current_user.school_id,
    )

    try:
        result = gateway.initialize_payment(
            amount=session.amount,
            currency=session.currency,
            email=parent.phone_1 + "@placeholder.com" if parent else "parent@zenova.com",
            first_name=student.first_name if student else "Parent",
            last_name=student.last_name if student else "User",
            tx_ref=session.session_id,
            callback_url=f"{settings.base_url}/api/v1/parent-payments/chapa/webhook",
            return_url=f"{settings.base_url}/parent/payment/success?session={session.session_id}",
            description=f"Payment for {student.first_name if student else 'Student'}",
        )

        session.gateway_reference = result.gateway_reference
        session.status = "processing"
        db.commit()

        return {
            "checkout_url": result.checkout_url,
            "reference": result.gateway_reference,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parent-payments/chapa/webhook")
async def chapa_webhook_handler(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Handle payment gateway webhook callbacks."""
    payload = await request.body()
    data = await request.json()
    tx_ref = data.get("tx_ref", "")
    status = data.get("status", "")

    gateway = PaymentGatewayFactory.get_gateway("chapa", db=db)

    signature = request.headers.get("X-Chapa-Signature", "")
    if not gateway.verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        if status == "success":
            from app.models.payment_session import PaymentSession
            ps = db.query(PaymentSession).filter(PaymentSession.session_id == tx_ref).first()
            verification = gateway.verify_transaction(tx_ref)
            if verification.success:
                payment = process_chapa_payment(db, tx_ref, data)

                background_tasks.add_task(
                    _send_payment_notification,
                    payment.id,
                    payment.student_id,
                    payment.amount,
                )

                return {"status": "success", "payment_id": payment.id}

        return {"status": "ignored"}
    except Exception:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception("Payment webhook processing failed")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/parent-payments/receipts")
def get_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all receipts for parent's payments."""
    if not current_user.parent_id:
        raise HTTPException(status_code=400, detail="User is not linked to a parent profile")

    receipts = db.query(Receipt).filter(
        Receipt.parent_id == current_user.parent_id,
        Receipt.school_id == current_user.school_id,
    ).order_by(Receipt.created_at.desc()).all()

        return [
        {
            "id": r.id,
            "receipt_number": r.receipt_number,
            "amount_paid": r.amount_paid,
            "payment_method": r.payment_method,
            "payment_date": r.payment_date.isoformat(),
            "status": r.status,
            "transaction_id": r.transaction_id,
        }
        for r in receipts
    ]


@router.get("/parent-payments/receipts/{receipt_id}/download")
def download_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download receipt as PDF."""
    if not current_user.parent_id:
        raise HTTPException(status_code=400, detail="User is not linked to a parent profile")

    receipt = get_receipt_by_id(db, receipt_id, current_user.parent_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    pdf_bytes = generate_receipt_pdf(db, receipt_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="receipt_{receipt.receipt_number}.pdf"',
        },
    )


class RefundRequestInput(BaseModel):
    payment_id: str
    amount: Decimal = Field(gt=0)
    reason: str = Field(min_length=1, max_length=500)


@router.post("/parent-payments/refund/request")
def request_refund_endpoint(
    data: RefundRequestInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request a refund for a payment."""
    if not current_user.parent_id:
        raise HTTPException(status_code=400, detail="User is not linked to a parent profile")

    # Validate payment ownership: payment -> invoice -> student -> parent link
    payment = db.query(Payment).filter(Payment.id == data.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not payment.student_id:
        raise HTTPException(status_code=400, detail="Payment has no associated student")
    link = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == current_user.parent_id,
        ParentStudentLink.student_id == payment.student_id,
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="This payment is not linked to your child")

    try:
        refund = request_refund(
            db=db,
            payment_id=data.payment_id,
            amount=Decimal(str(data.amount)),
            reason=data.reason,
            requested_by=current_user.id,
        )
        return {
            "refund_id": refund.id,
            "refund_number": refund.refund_number,
            "status": refund.status,
            "amount": refund.amount,
        }
    except PaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/parent-payments/refund/{refund_id}/approve")
def approve_refund_endpoint(
    refund_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a refund request (Admin only)."""
    from app.core.permissions import has_permission, Permission
    if not has_permission(current_user, Permission.FINANCE_ENTRY):
        raise HTTPException(status_code=403, detail="Finance permission required")
    try:
        refund = approve_refund(db, refund_id, current_user.id, current_user.school_id)
        return {
            "refund_id": refund.id,
            "status": refund.status,
            "approved_at": refund.approved_at.isoformat() if refund.approved_at else None,
        }
    except PaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/parent-payments/refund/{refund_id}/process")
def process_refund_endpoint(
    refund_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process an approved refund (Finance only)."""
    from app.core.permissions import has_permission, Permission
    if not has_permission(current_user, Permission.FINANCE_ENTRY):
        raise HTTPException(status_code=403, detail="Finance permission required")
    try:
        refund = process_refund(db, refund_id, current_user.id, current_user.school_id)
        return {
            "refund_id": refund.id,
            "status": refund.status,
            "processed_at": refund.processed_at.isoformat() if refund.processed_at else None,
        }
    except PaymentError as e:
        raise HTTPException(status_code=500, detail=str(e))


def _send_payment_notification(payment_id: str, student_id: str, amount: Decimal):
    """Send payment notification (SMS/Email/Push) and email receipt."""
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            from app.core.notifications import send_payment_confirmation
            send_payment_confirmation(payment_id=payment_id, student_id=student_id, amount=amount, db=db)
            from app.services.receipt_service import email_receipt_pdf
            receipt = db.query(Receipt).filter(Receipt.payment_id == payment_id).first()
            if receipt:
                parent_record = db.query(Parent).filter(Parent.id == receipt.parent_id).first()
                if parent_record and parent_record.email:
                    email_receipt_pdf(db, receipt.id, parent_record.email)
        finally:
            db.close()
    except Exception:
        logger.warning("Payment notification failed for %s", payment_id, exc_info=True)
