import uuid
import secrets
import json
from base64 import b64encode, b64decode, urlsafe_b64encode, urlsafe_b64decode
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.qr_code import QRCode
from app.core.audit import log_audit
from app.config import settings
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes


def _get_qr_encryption_key() -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"zenova-qr-token-v1",
    )
    return hkdf.derive(settings.secret_key.encode())


def _generate_encrypted_token(reference_type: str, reference_id: str) -> str:
    payload = json.dumps({
        "type": reference_type,
        "id": reference_id,
        "nonce": secrets.token_hex(8),
        "ts": datetime.now(timezone.utc).isoformat(),
    }).encode()
    key = _get_qr_encryption_key()
    aesgcm = AESGCM(key)
    nonce = secrets.token_bytes(12)
    ciphertext = aesgcm.encrypt(nonce, payload, None)
    return "A1|" + urlsafe_b64encode(nonce + ciphertext).decode()


def _decrypt_token(token: str) -> dict | None:
    try:
        if token.startswith("A1|"):
            raw = urlsafe_b64decode(token[3:])
            nonce, ciphertext = raw[:12], raw[12:]
            key = _get_qr_encryption_key()
            aesgcm = AESGCM(key)
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
            return json.loads(plaintext)
    except Exception:
        pass
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
    user_id: str = None,
) -> QRCode:
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
    log_audit(
        db=db,
        user_id=user_id or "system",
        table_name="qr_codes",
        record_id=qr.id,
        action="QR_GENERATED",
        new_data={"reference_type": reference_type, "reference_id": reference_id, "uuid": qr_uuid},
        school_id=school_id,
    )
    db.commit()
    db.refresh(qr)

    return qr


def validate_qr(db: Session, qr_uuid: str) -> dict:
    qr = db.query(QRCode).filter(QRCode.uuid == qr_uuid).first()
    if not qr:
        return {"valid": False, "message": "QR code not found"}

    if not qr.is_active:
        return {"valid": False, "message": "QR code is deactivated"}

    if qr.expires_at and qr.expires_at < datetime.now(timezone.utc):
        return {"valid": False, "message": "QR code has expired"}

    return {
        "valid": True,
        "reference_type": qr.reference_type,
        "reference_id": qr.reference_id,
        "message": "QR code is valid",
    }


def get_qr_by_reference(db: Session, reference_type: str, reference_id: str, school_id: str = None) -> QRCode | None:
    q = db.query(QRCode).filter(
        QRCode.reference_type == reference_type,
        QRCode.reference_id == reference_id,
        QRCode.is_active == True,
    )
    if school_id:
        q = q.filter(QRCode.school_id == school_id)
    return q.first()


def get_qr_history(db: Session, school_id: str | None = None) -> list[QRCode]:
    query = db.query(QRCode)
    if school_id:
        query = query.filter(QRCode.school_id == school_id)
    return query.order_by(QRCode.created_at.desc()).limit(100).all()
