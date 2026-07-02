import json
import secrets
import pyotp
from sqlalchemy.orm import Session
from app.models.user import User


MFA_ISSUER = "ZENOVA"


def generate_secret() -> str:
    return pyotp.random_base32()


def generate_backup_codes(count: int = 10) -> list[str]:
    return [secrets.token_hex(4).upper() for _ in range(count)]


def get_totp(secret: str) -> pyotp.TOTP:
    return pyotp.TOTP(secret)


def verify_totp(secret: str, code: str) -> bool:
    totp = get_totp(secret)
    return totp.verify(code, valid_window=1)


def verify_backup_code(user: User, code: str) -> bool:
    if not user.mfa_backup_codes:
        return False
    try:
        codes = json.loads(user.mfa_backup_codes)
    except (json.JSONDecodeError, TypeError):
        return False
    if code.upper() in codes:
        codes.remove(code.upper())
        user.mfa_backup_codes = json.dumps(codes)
        return True
    return False


def initiate_mfa_setup(db: Session, user: User) -> dict:
    """Generate a TOTP secret and save it on the user (MFA remains disabled).

    Call ``complete_mfa_setup()`` after the user verifies a code to enable MFA.
    """
    secret = generate_secret()
    user.mfa_secret = secret
    db.commit()
    provisioning_uri = get_totp(secret).provisioning_uri(
        name=user.email, issuer_name=MFA_ISSUER
    )
    return {
        "secret": secret,
        "qr_code_url": provisioning_uri,
    }


def complete_mfa_setup(db: Session, user: User, code: str) -> dict | None:
    """Verify a TOTP code and enable MFA for the user.

    Returns a dict with backup codes on success, or ``None`` if the code is invalid.
    """
    if not user.mfa_secret or not verify_totp(user.mfa_secret, code):
        return None
    backup_codes = generate_backup_codes()
    user.mfa_backup_codes = json.dumps(backup_codes)
    user.mfa_enabled = True
    db.commit()
    db.refresh(user)
    return {"backup_codes": backup_codes}


def disable_mfa(db: Session, user: User) -> None:
    user.mfa_secret = None
    user.mfa_backup_codes = None
    user.mfa_enabled = False
    db.commit()


def regenerate_backup_codes(db: Session, user: User) -> list[str]:
    """Replace existing backup codes with new ones."""
    codes = generate_backup_codes()
    user.mfa_backup_codes = json.dumps(codes)
    db.commit()
    return codes


def verify_mfa_code(user: User, code: str) -> bool:
    if not user.mfa_secret:
        return False
    if verify_totp(user.mfa_secret, code):
        return True
    return verify_backup_code(user, code)


MFA_REQUIRED_ROLES = {"SUPER_ADMIN", "FINANCE"}


def mfa_required_for_role(role_name: str | None) -> bool:
    if not role_name:
        return False
    return role_name.upper() in MFA_REQUIRED_ROLES
