from sqlalchemy.orm import Session
from app.models.currency import Currency

DEFAULT_CURRENCIES = [
    {"code": "ETB", "name": "Ethiopian Birr", "symbol": "Br", "rate": 1.0, "is_base": True},
    {"code": "USD", "name": "US Dollar", "symbol": "$", "rate": 57.50},
    {"code": "EUR", "name": "Euro", "symbol": "€", "rate": 62.00},
    {"code": "GBP", "name": "British Pound", "symbol": "£", "rate": 72.80},
    {"code": "AED", "name": "UAE Dirham", "symbol": "د.إ", "rate": 15.65},
    {"code": "SAR", "name": "Saudi Riyal", "symbol": "﷼", "rate": 15.30},
    {"code": "KES", "name": "Kenyan Shilling", "symbol": "KSh", "rate": 0.42},
    {"code": "UGX", "name": "Ugandan Shilling", "symbol": "USh", "rate": 0.015},
    {"code": "TZS", "name": "Tanzanian Shilling", "symbol": "TSh", "rate": 0.022},
]


def seed_currencies(db: Session):
    existing = db.query(Currency).count()
    if existing > 0:
        return
    for c in DEFAULT_CURRENCIES:
        db.add(Currency(
            code=c["code"],
            name=c["name"],
            symbol=c["symbol"],
            exchange_rate_to_etb=c["rate"],
            is_base=c.get("is_base", False),
        ))
    db.commit()


def get_active_currencies(db: Session) -> list[Currency]:
    return db.query(Currency).filter(Currency.is_active == True).order_by(Currency.code).all()


def get_currency(db: Session, code: str) -> Currency | None:
    return db.query(Currency).filter(Currency.code == code.upper()).first()


def convert_amount(amount, from_currency: str, to_currency: str, db: Session):
    if from_currency == to_currency:
        return amount
    from_c = get_currency(db, from_currency)
    to_c = get_currency(db, to_currency)
    if not from_c or not to_c:
        return amount
    etb_amount = float(amount) * float(from_c.exchange_rate_to_etb)
    return round(etb_amount / float(to_c.exchange_rate_to_etb), 2)
