"""Chapa Payment Gateway Integration — supports per-school API keys."""
import os
import json
import hashlib
import hmac
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import httpx
from sqlalchemy.orm import Session

from app.config import settings

CHAPA_API_URL = "https://api.chapa.co/v1"

_DEFAULT_SECRET_KEY = os.getenv("CHAPA_SECRET_KEY", "")
_DEFAULT_PUBLIC_KEY = os.getenv("CHAPA_PUBLIC_KEY", "")


class ChapaError(Exception):
    pass


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
            return config.secret_key, config.public_key or _DEFAULT_PUBLIC_KEY
    return _DEFAULT_SECRET_KEY, _DEFAULT_PUBLIC_KEY


def _get_headers(secret_key: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }


def initialize_payment(
    amount: float,
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

    try:
        response = httpx.post(
            f"{CHAPA_API_URL}/transaction/initialize",
            headers=_get_headers(secret_key),
            json=payload,
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        raise ChapaError(f"Chapa API error: {str(e)}")


def verify_transaction(
    tx_ref: str,
    db: Optional[Session] = None,
    school_id: Optional[str] = None,
) -> Dict[str, Any]:
    secret_key, _ = _get_school_chapa_keys(db, school_id)
    if not secret_key:
        raise ChapaError("Chapa secret key not configured")

    try:
        response = httpx.get(
            f"{CHAPA_API_URL}/transaction/verify/{tx_ref}",
            headers=_get_headers(secret_key),
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        raise ChapaError(f"Chapa verification error: {str(e)}")


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


def get_banks() -> Dict[str, Any]:
    secret_key = _DEFAULT_SECRET_KEY
    try:
        response = httpx.get(
            f"{CHAPA_API_URL}/banks",
            headers=_get_headers(secret_key),
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        raise ChapaError(f"Failed to fetch banks: {str(e)}")


def transfer_to_bank(
    account_number: str,
    account_name: str,
    bank_code: str,
    amount: float,
    currency: str = "ETB",
    reference: str = "",
    db: Optional[Session] = None,
    school_id: Optional[str] = None,
) -> Dict[str, Any]:
    secret_key, _ = _get_school_chapa_keys(db, school_id)
    payload = {
        "account_number": account_number,
        "account_name": account_name,
        "bank_code": bank_code,
        "amount": str(amount),
        "currency": currency,
        "reference": reference,
    }
    try:
        response = httpx.post(
            f"{CHAPA_API_URL}/transfers",
            headers=_get_headers(secret_key),
            json=payload,
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        raise ChapaError(f"Transfer failed: {str(e)}")
