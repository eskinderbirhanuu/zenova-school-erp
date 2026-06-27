from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.config import settings
import re
import secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
BCRYPT_ROUNDS = 12


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password, switchable=True)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password, rounds=BCRYPT_ROUNDS, ident="2b")


PASSWORD_POLICY = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]).{8,128}$"
)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Returns (valid, message). Enforce strong passwords."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 128:
        return False, "Password must be at most 128 characters"
    if not PASSWORD_POLICY.match(password):
        return False, (
            "Password must contain uppercase, lowercase, digit, and special character"
        )
    return True, ""


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "jti": secrets.token_hex(16)})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    jti = secrets.token_hex(16)
    to_encode.update({"exp": expire, "type": "refresh", "jti": jti})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except Exception:
        return None