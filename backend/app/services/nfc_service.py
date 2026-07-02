from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.nfc_card import NFCCard
from app.core.audit import log_audit


def assign_nfc(
    db: Session,
    card_uid: str,
    reference_type: str,
    reference_id: str,
    school_id: str | None = None,
    assigned_by: str | None = None,
) -> NFCCard:
    """Assign an NFC card to a person"""
    existing = db.query(NFCCard).filter(NFCCard.card_uid == card_uid).first()
    if existing:
        raise ValueError("NFC card UID already assigned")

    nfc = NFCCard(
        card_uid=card_uid,
        reference_type=reference_type,
        reference_id=reference_id,
        school_id=school_id,
        assigned_by=assigned_by,
    )
    db.add(nfc)
    log_audit(
        db=db,
        user_id=assigned_by or "system",
        table_name="nfc_cards",
        record_id=nfc.id,
        action="NFC_ASSIGNED",
        new_data={"card_uid": card_uid, "reference_type": reference_type, "reference_id": reference_id},
    )
    db.commit()
    db.refresh(nfc)

    return nfc


def validate_nfc(db: Session, card_uid: str) -> dict:
    """Validate an NFC card by UID"""
    nfc = db.query(NFCCard).filter(NFCCard.card_uid == card_uid).first()
    if not nfc:
        return {"valid": False, "message": "NFC card not found"}

    if nfc.status != "active":
        return {"valid": False, "message": f"NFC card is {nfc.status}"}

    if nfc.expiry_date and nfc.expiry_date < datetime.now(timezone.utc):
        return {"valid": False, "message": "NFC card has expired"}

    return {
        "valid": True,
        "reference_type": nfc.reference_type,
        "reference_id": nfc.reference_id,
        "status": nfc.status,
        "message": "NFC card is valid",
    }


def update_nfc_status(db: Session, nfc_id: str, status: str, school_id: str = None, user_id: str = None) -> NFCCard | None:
    """Update NFC card status"""
    q = db.query(NFCCard).filter(NFCCard.id == nfc_id)
    if school_id:
        q = q.filter(NFCCard.school_id == school_id)
    nfc = q.first()
    if not nfc:
        return None

    old_status = nfc.status
    nfc.status = status
    log_audit(
        db=db,
        user_id=user_id or "system",
        table_name="nfc_cards",
        record_id=nfc.id,
        action="NFC_STATUS_CHANGED",
        old_data={"status": old_status},
        new_data={"status": status},
    )
    db.commit()

    return nfc


def get_nfc_history(db: Session, school_id: str | None = None) -> list[NFCCard]:
    """Get NFC assignment history"""
    query = db.query(NFCCard)
    if school_id:
        query = query.filter(NFCCard.school_id == school_id)
    return query.order_by(NFCCard.created_at.desc()).limit(100).all()
