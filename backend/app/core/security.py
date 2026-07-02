from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from app.config import settings
import re
import secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
BCRYPT_ROUNDS = 12


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Constant-time bcrypt compare. bcrypt handles timing internally.
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password, rounds=BCRYPT_ROUNDS, ident="2b")


PASSWORD_POLICY = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]).{8,128}$"
)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Returns (valid, message). Enforce strong passwords."""
    if not isinstance(password, str) or len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 128:
        return False, "Password must be at most 128 characters"
    if not PASSWORD_POLICY.match(password):
        return False, (
            "Password must contain uppercase, lowercase, digit, and special character"
        )
    # Block trivial/known-weak passwords used by demos and bots.
    weak = {"password", "password1", "12345678", "admin123", "demo123", "qwerty12"}
    if password.lower() in weak:
        return False, "Password is too common. Choose a stronger password."
    return True, ""


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access", "jti": secrets.token_hex(16)})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    jti = secrets.token_hex(16)
    to_encode.update({"exp": expire, "type": "refresh", "jti": jti})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_password_reset_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Dedicated password-reset token. Distinct `type` so it can NEVER be used as an
    access or refresh token — see get_current_user which only accepts type=access."""
    to_encode = data.copy()
    ttl = expires_delta or timedelta(minutes=15)
    to_encode.update({
        "exp": datetime.now(timezone.utc) + ttl,
        "type": "password_reset",
        "purpose": "password_reset",
        "jti": secrets.token_hex(16),
    })
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except Exception:
        return None


# ─── Account recovery codes (offline-safe password reset) ─────────────
# Replaces the insecure "license key + employee_id = reset any password" flow.
# An authenticated admin mints a short-lived code bound to a specific user_id;
# the public reset endpoint consumes it. Codes are HMAC-signed and TTL-bound.

import hmac as _hmac
import hashlib as _hashlib
import time as _time


def _recovery_secret() -> bytes:
    """Derive a stable secret for recovery-code signing from the app secret key."""
    return _hashlib.sha256(("recovery:" + settings.secret_key).encode()).digest()


def issue_password_recovery_code(user_id: str, ttl_seconds: int = 600) -> str:
    """Mint a TTL-bound, single-use recovery code for a user_id.

    Format: <user_id>.<exp_epoch>.<hmac_hex>
    """
    exp = int(_time.time()) + ttl_seconds
    msg = f"{user_id}.{exp}".encode()
    sig = _hmac.new(_recovery_secret(), msg, _hashlib.sha256).hexdigest()
    return f"{user_id}.{exp}.{sig}"


def verify_password_recovery_code(code: str, expected_user_id: str) -> bool:
    """Validate a recovery code for a specific user. Constant-time on the signature."""
    if not code or not expected_user_id:
        return False
    parts = code.split(".")
    if len(parts) != 3:
        return False
    uid, exp_str, sig = parts
    try:
        exp = int(exp_str)
    except ValueError:
        return False
    if uid != expected_user_id:
        return False
    if exp < _time.time():
        return False
    msg = f"{uid}.{exp}".encode()
    expected_sig = _hmac.new(_recovery_secret(), msg, _hashlib.sha256).hexdigest()
    return _hmac.compare_digest(sig, expected_sig)