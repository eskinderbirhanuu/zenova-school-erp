from datetime import datetime, timezone
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
    old_data: dict | None = None,
    new_data: dict | None = None,
    school_id: str | None = None,
):
    """Add an audit row to the current session. Does NOT commit — caller owns the transaction."""
    audit = AuditLog(
        school_id=school_id,
        table_name=table_name,
        record_id=record_id,
        action=action,
        new_data=new_data if new_data is not None else description,
        old_data=old_data,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit)
    db.flush()
    return audit


def log_audit_and_commit(
    db: Session,
    user_id: str,
    action: str,
    table_name: str,
    record_id: str,
    description: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    old_data: dict | None = None,
    new_data: dict | None = None,
    school_id: str | None = None,
):
    """Add an audit row and commit immediately. Use only when the caller has no open transaction."""
    audit = log_audit(db, user_id, action, table_name, record_id,
                       description, ip_address, user_agent, old_data, new_data, school_id=school_id)
    db.commit()
    return audit
