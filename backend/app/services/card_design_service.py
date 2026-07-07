from sqlalchemy.orm import Session
from app.models.card_design import CardDesign


def get_design(db: Session, school_id: str) -> CardDesign | None:
    return db.query(CardDesign).filter(CardDesign.school_id == school_id).first()


def save_design(db: Session, school_id: str, logo_url: str | None = None, design_json: str | None = None) -> CardDesign:
    existing = get_design(db, school_id)
    if existing:
        if logo_url is not None:
            existing.logo_url = logo_url
        if design_json is not None:
            existing.design_json = design_json
        db.commit()
        db.refresh(existing)
        return existing
    design = CardDesign(school_id=school_id, logo_url=logo_url, design_json=design_json)
    db.add(design)
    db.commit()
    db.refresh(design)
    return design
