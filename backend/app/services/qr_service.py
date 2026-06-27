import uuid
import secrets
import json
from base64 import b64encode, b64decode
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.qr_code import QRCode
from app.core.audit import log_audit


def _generate_encrypted_token(reference_type: str, reference_id: str) -> str:
    """Generate an encrypted token for QR data"""
    payload = json.dumps({
        "type": reference_type,
        "id": reference_id,
        "nonce": secrets.token_hex(8),
        "ts": datetime.utcnow().isoformat(),
    })
    return b64encode(payload.encode()).decode()


def _decrypt_token(token: str) -> dict | None:
    """Decrypt QR token (simple base64 for now)"""
    try:
        decoded = b64decode(token.encode()).decode()
        return json.loads(decoded)
    except Exception:
        return None


def generate_qr(
    db: Session,
    reference_type: str,
    reference_id: str,
    school_id: str | None = None,
    branch_id: str | None = None,
) -> QRCode:
    """Generate a QR code for a person"""
    qr_uuid = str(uuid.uuid4())
    encrypted_token = _generate_encrypted_token(reference_type, reference_id)

    qr = QRCode(
        uuid=qr_uuid,
        encrypted_token=encrypted_token,
        reference_type=reference_type,
        reference_id=reference_id,
        school_id=school_id,
        branch_id=branch_id,
    )
    db.add(qr)
    db.commit()
    db.refresh(qr)

    log_audit(
        db=db,
        table_name="qr_codes",
        record_id=qr.id,
        action="QR_GENERATED",
        new_data={"reference_type": reference_type, "reference_id": reference_id, "uuid": qr_uuid},
    )

    return qr


def validate_qr(db: Session, qr_uuid: str) -> dict:
    """Validate a QR code by UUID"""
    qr = db.query(QRCode).filter(QRCode.uuid == qr_uuid).first()
    if not qr:
        return {"valid": False, "message": "QR code not found"}

    if not qr.is_active:
        return {"valid": False, "message": "QR code is deactivated"}

    if qr.expires_at and qr.expires_at < datetime.utcnow():
        return {"valid": False, "message": "QR code has expired"}

    return {
        "valid": True,
        "reference_type": qr.reference_type,
        "reference_id": qr.reference_id,
        "message": "QR code is valid",
    }


def get_qr_by_reference(db: Session, reference_type: str, reference_id: str) -> QRCode | None:
    """Get QR code for a specific entity"""
    return db.query(QRCode).filter(
        QRCode.reference_type == reference_type,
        QRCode.reference_id == reference_id,
        QRCode.is_active == True,
    ).first()


def get_qr_history(db: Session, school_id: str | None = None) -> list[QRCode]:
    """Get QR code generation history"""
    query = db.query(QRCode)
    if school_id:
        query = query.filter(QRCode.school_id == school_id)
    return query.order_by(QRCode.created_at.desc()).limit(100).all()
