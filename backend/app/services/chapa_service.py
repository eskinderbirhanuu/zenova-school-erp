"""Chapa Payment Gateway Integration — supports per-school API keys."""
import os
import json
import hashlib
import hmac
from decimal import Decimal
from typing import Optional, Dict, Any, Callable
from datetime import datetime, timezone
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.utils.circuit_breaker import CircuitBreaker

CHAPA_API_URL = settings.chapa_api_url
_chapa_breaker = CircuitBreaker("chapa", failure_threshold=5, recovery_timeout=30)


class ChapaError(Exception):
    pass


def _default_chapa_keys() -> tuple[str, str]:
    return os.getenv("CHAPA_SECRET_KEY", ""), os.getenv("CHAPA_PUBLIC_KEY", "")


def _get_school_chapa_keys(db: Session, school_id: Optional[str] = None) -> tuple[str, str]:
    """Return (secret_key, public_key) for a school, falling back to global env."""
    if school_id and db:
        from app.models.payment_gateway_config import PaymentGatewayConfig
        config = db.query(PaymentGatewayConfig).filter(
            PaymentGatewayConfig.school_id == school_id,
            PaymentGatewayConfig.gateway == "chapa",
            PaymentGatewayConfig.is_active == True,
        ).first()
        if config and config.secret_key:
            return config.secret_key, config.public_key or ""
    return _default_chapa_keys()


def _get_headers(secret_key: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }


def initialize_payment(
    amount: Decimal,
    currency: str,
    email: str,
    first_name: str,
    last_name: str,
    tx_ref: str,
    callback_url: str,
    return_url: str,
    description: str = "",
    phone_number: Optional[str] = None,
    db: Optional[Session] = None,
    school_id: Optional[str] = None,
) -> Dict[str, Any]:
    secret_key, _ = _get_school_chapa_keys(db, school_id)
    if not secret_key:
        raise ChapaError("Chapa secret key not configured")

    payload = {
        "amount": str(amount),
        "currency": currency,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "tx_ref": tx_ref,
        "callback_url": callback_url,
        "return_url": return_url,
        "description": description,
    }
    if phone_number:
        payload["phone_number"] = phone_number

    def _do_initialize():
        try:
            r = httpx.post(
                f"{CHAPA_API_URL}/transaction/initialize",
                headers=_get_headers(secret_key),
                json=payload,
                timeout=30.0,
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ChapaError(f"Chapa API error: {str(e)}")
    return _chapa_breaker.call(_do_initialize)


def verify_transaction(
    tx_ref: str,
    db: Optional[Session] = None,
    school_id: Optional[str] = None,
) -> Dict[str, Any]:
    secret_key, _ = _get_school_chapa_keys(db, school_id)
    if not secret_key:
        raise ChapaError("Chapa secret key not configured")

    def _do_verify():
        try:
            r = httpx.get(
                f"{CHAPA_API_URL}/transaction/verify/{tx_ref}",
                headers=_get_headers(secret_key),
                timeout=30.0,
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ChapaError(f"Chapa verification error: {str(e)}")
    return _chapa_breaker.call(_do_verify)


def verify_webhook_signature(
    payload: bytes,
    signature: str,
    db: Optional[Session] = None,
    school_id: Optional[str] = None,
) -> bool:
    secret_key, _ = _get_school_chapa_keys(db, school_id)
    if not secret_key:
        return False
    expected = hmac.new(secret_key.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


