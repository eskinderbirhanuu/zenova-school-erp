"""
License file validator — runs at application startup.

Validates:
  1. .lic file exists at the standard OS path
  2. RSA signature matches (integrity check)
  3. License has not expired
  4. Hardware fingerprint matches (or is "*" for first activation)

On first activation (* fingerprint), binds the license to current hardware.
"""
import logging
import platform
from datetime import datetime, timezone
from typing import Optional

from app.services.license_crypto import (
    verify_license_file,
    read_lic_file,
    get_lic_file_path,
    get_machine_fingerprint,
    match_hostname,
    match_fingerprint_components,
    encode_hardware_components,
    get_fingerprint_components,
    get_active_environment,
    get_environment_fingerprint,
)
from app.licensing.coreval_wrapper import verify_lic_file as c_verify_lic, has_c_extension
from app.database import SessionLocal
from app.models.license import License, LicenseType, LicenseStatus
from app.core.audit import log_audit

logger = logging.getLogger(__name__)


class LicenseValidationResult:
    def __init__(
        self,
        valid: bool,
        restrict: bool = True,
        message: str = "",
        payload: Optional[dict] = None,
    ):
        self.valid = valid
        self.restrict_nfc = restrict
        self.restrict_qr = restrict
        self.restrict_import = restrict
        self.restrict_id_card = restrict
        self.message = message
        self.payload = payload or {}

    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "restrict_nfc": self.restrict_nfc,
            "restrict_qr": self.restrict_qr,
            "restrict_import": self.restrict_import,
            "restrict_id_card": self.restrict_id_card,
            "message": self.message,
        }


def _check_cloud_license(key: str, fingerprint: str) -> dict:
    """Verify license against cloud license server (superadmin.free.nf)."""
    import httpx
    from app.config import settings
    try:
        resp = httpx.post(
            f"{settings.license_server_url}/api/v1/license/verify",
            json={"key": key, "machine_fingerprint": fingerprint},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
        return {"valid": False, "message": "Cloud license server error"}
    except Exception as e:
        return {"valid": False, "message": f"Cannot reach license server: {e}"}


def validate_lic_file() -> LicenseValidationResult:
    """Validate the .lic file on disk. Returns result with restrictions."""
    lic_path = get_lic_file_path()
    lic_content = read_lic_file()
    if lic_content is None:
        logger.warning("No .lic file found at %s", lic_path)
        return LicenseValidationResult(
            valid=False,
            message=f"No license file found at {lic_path}",
        )

    # Try C extension first (anti-monkey-patch)
    if has_c_extension():
        c_result = c_verify_lic(lic_path)
        if c_result != 0:
            logger.warning("C extension verification failed (bad signature)")
            return LicenseValidationResult(
                valid=False,
                message="License file signature verification failed (coreval)",
            )
        logger.info("C extension verification passed")

    # Python-level verification (parses payload for expiry/hostname checks)
    payload = verify_license_file(lic_content)
    if payload is None:
        logger.warning("License file verification failed (bad signature)")
        return LicenseValidationResult(
            valid=False,
            message="License file signature verification failed",
        )

    # Check expiry
    valid_until_str = payload.get("valid_until")
    if valid_until_str:
        try:
            valid_until = datetime.fromisoformat(valid_until_str)
            if valid_until.tzinfo is None:
                valid_until = valid_until.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > valid_until:
                logger.warning("License expired: %s", valid_until_str)
                return LicenseValidationResult(
                    valid=False,
                    message=f"License expired on {valid_until_str}",
                )
        except (ValueError, TypeError):
            logger.warning("Invalid valid_until format: %s", valid_until_str)
            return LicenseValidationResult(
                valid=False,
                message="Invalid license expiry format",
            )

    # Check hardware / hostname binding
    lic_fingerprint = payload.get("machine_fingerprint", "")
    if lic_fingerprint == "*":
        logger.info("First activation — binding to current hardware")
        _bind_license(payload)
    elif _is_hostname_pattern(lic_fingerprint):
        if not match_hostname(lic_fingerprint):
            logger.warning("Hostname mismatch: pattern=%s current=%s",
                           lic_fingerprint, platform.node())
            return LicenseValidationResult(
                valid=False,
                message=f"Hostname mismatch — license bound to '{lic_fingerprint}'",
            )
        logger.info("Hostname match: %s", lic_fingerprint)
    else:
        db = SessionLocal()
        try:
            record = db.query(License).filter(
                License.school_id == payload.get("school_id"),
            ).first()
            if record and record.hardware_id:
                is_match, match_count, total = match_fingerprint_components(record.hardware_id)
                if not is_match:
                    logger.warning("Hardware fingerprint mismatch: %d/%d components", match_count, total)
                    log_audit(
                        db, "system", "HW_MISMATCH", "licenses",
                        record.id,
                        old_data={"hardware_id": record.hardware_id},
                        new_data={"match_count": match_count, "total": total, "threshold": 0.75},
                        school_id=payload.get("school_id"),
                    )
                    db.commit()
                    return LicenseValidationResult(
                        valid=False,
                        message=f"Hardware fingerprint mismatch — only {match_count}/{total} components matched",
                    )
            else:
                current = get_machine_fingerprint()
                if lic_fingerprint != current:
                    logger.warning("Hardware fingerprint mismatch (exact hash)")
                    return LicenseValidationResult(
                        valid=False,
                        message="Hardware fingerprint mismatch — license bound to different machine",
                    )
        except Exception:
            pass
        finally:
            db.close()

    return LicenseValidationResult(
        valid=True,
        restrict=False,
        message="License is valid",
        payload=payload,
    )


def _bind_license(payload: dict):
    """On first activation, record the hardware fingerprint in DB."""
    db = SessionLocal()
    try:
        record = db.query(License).filter(
            License.school_id == payload.get("school_id"),
        ).first()
        if record and not record.machine_fingerprint:
            env = get_active_environment()
            record.machine_fingerprint = get_environment_fingerprint(env)
            record.hardware_id = encode_hardware_components(get_fingerprint_components())
            record.runtime_environment = env
            log_audit(
                db, "system", "HW_BIND", "licenses",
                record.id,
                new_data={
                    "machine_fingerprint": record.machine_fingerprint,
                    "runtime_environment": env,
                },
                school_id=payload.get("school_id"),
            )
            db.commit()
            logger.info("License bound to hardware (%s): %s", env, record.id)
    except Exception as e:
        logger.error("Failed to bind license: %s", e)
    finally:
        db.close()


def _is_hostname_pattern(fingerprint: str) -> bool:
    """Detect if fingerprint is a hostname pattern rather than a hardware hash."""
    if not fingerprint or fingerprint == "*":
        return False
    if fingerprint.startswith("*.") or fingerprint.endswith("*"):
        return True
    if fingerprint == platform.node():
        return True
    if "*" in fingerprint:
        return True
    return False
