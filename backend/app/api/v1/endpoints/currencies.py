from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.models.currency import Currency
from app.services.currency_service import get_active_currencies, get_currency, seed_currencies
from app.core.permissions import Permission

router = APIRouter(prefix="/currencies", tags=["currencies"])


class CurrencyResponse(BaseModel):
    code: str
    name: str
    symbol: str
    exchange_rate_to_etb: float
    is_base: bool
    is_active: bool

    class Config:
        from_attributes = True


class CurrencyUpdateRequest(BaseModel):
    exchange_rate_to_etb: float = Field(..., gt=0)
    is_active: bool | None = None


class CurrencyListResponse(BaseModel):
    currencies: list[CurrencyResponse]


@router.get("", response_model=CurrencyListResponse)
def list_currencies(
    db: Session = Depends(get_db),
    _=Depends(require_permission(Permission.FINANCE_REPORTS)),
):
    seed_currencies(db)
    currencies = get_active_currencies(db)
    return CurrencyListResponse(
        currencies=[
            CurrencyResponse(
                code=c.code,
                name=c.name,
                symbol=c.symbol,
                exchange_rate_to_etb=float(c.exchange_rate_to_etb),
                is_base=c.is_base,
                is_active=c.is_active,
            )
            for c in currencies
        ]
    )


@router.patch("/{code}", response_model=CurrencyResponse)
def update_currency(
    code: str,
    data: CurrencyUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS)),
):
    currency = get_currency(db, code)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    if currency.is_base:
        raise HTTPException(status_code=400, detail="Cannot modify base currency rate")

    currency.exchange_rate_to_etb = data.exchange_rate_to_etb
    if data.is_active is not None:
        currency.is_active = data.is_active
    db.commit()
    db.refresh(currency)

    return CurrencyResponse(
        code=currency.code,
        name=currency.name,
        symbol=currency.symbol,
        exchange_rate_to_etb=float(currency.exchange_rate_to_etb),
        is_base=currency.is_base,
        is_active=currency.is_active,
    )
