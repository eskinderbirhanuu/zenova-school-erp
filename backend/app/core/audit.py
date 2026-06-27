from datetime import datetime
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    user_id: str,
    action: str,
    table_name: str,
    record_id: str,
    description: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
):
    audit = AuditLog(
        table_name=table_name,
        record_id=record_id,
        action=action,
        new_data=description,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit)
    db.commit()
    return audit
