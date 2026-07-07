"""Webhook retry with dead-letter queue for failed payment webhooks."""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.payment_session import PaymentSession


MAX_RETRIES = 3
RETRY_DELAYS = [60, 300, 900]  # 1min, 5min, 15min


def enqueue_failed_webhook(
    db: Session,
    session_id: str,
    payload: Dict[str, Any],
    error: str,
):
    """Record a failed webhook for retry."""
    session = db.query(PaymentSession).filter(
        PaymentSession.session_id == session_id
    ).first()
    if not session:
        return

    session.webhook_payload = str(payload)
    retry_count = getattr(session, "webhook_retry_count", 0) + 1
    session.webhook_retry_count = retry_count
    session.webhook_last_error = error
    session.webhook_next_retry = datetime.now(timezone.utc) + timedelta(
        seconds=RETRY_DELAYS[min(retry_count - 1, len(RETRY_DELAYS) - 1)]
    )
    session.status = "failed" if retry_count >= MAX_RETRIES else "pending"
    db.commit()


def process_retry_queue(db: Session) -> list[str]:
    """Process all pending webhooks due for retry. Returns processed session IDs."""
    pending = db.query(PaymentSession).filter(
        PaymentSession.webhook_next_retry <= datetime.now(timezone.utc),
        PaymentSession.webhook_retry_count < MAX_RETRIES,
    ).all()

    processed = []
    for session in pending:
        try:
            from app.services.chapa_service import verify_transaction
            verification = verify_transaction(session.session_id)
            if verification.get("status") == "success":
                from app.services.parent_payment_service import process_chapa_payment
                process_chapa_payment(db, session.session_id, verification)
                session.status = "completed"
                processed.append(session.session_id)
        except Exception:
            retry_count = (session.webhook_retry_count or 0) + 1
            session.webhook_retry_count = retry_count
            if retry_count >= MAX_RETRIES:
                session.status = "dead"
            else:
                session.webhook_next_retry = datetime.now(timezone.utc) + timedelta(
                    seconds=RETRY_DELAYS[min(retry_count - 1, len(RETRY_DELAYS) - 1)]
                )
            session.webhook_last_error = "Retry failed"

    if pending:
        db.commit()
    return processed
