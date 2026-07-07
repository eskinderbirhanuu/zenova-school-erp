import logging
from sqlalchemy.orm import Session
from app.models.license import License
from app.services.license_crypto import get_machine_fingerprint

logger = logging.getLogger(__name__)


def backfill_tpm_sealed_data(db: Session) -> int:
    """Backfill tpm_sealed_data for existing licenses that have machine_fingerprint but no tpm_sealed_data.

    Uses software-based sealing (AES-GCM) as fallback for existing records.
    Returns count of licenses updated.
    """
    from app.services.tpm_service import seal_license_data

    licenses = db.query(License).filter(
        License.machine_fingerprint.isnot(None),
        License.tpm_sealed_data.is_(None),
    ).all()

    if not licenses:
        return 0

    count = 0
    for lic in licenses:
        try:
            fingerprint = lic.machine_fingerprint or get_machine_fingerprint()
            lic.tpm_sealed_data = seal_license_data(fingerprint)
            count += 1
        except Exception as e:
            logger.warning("Failed to backfill TPM data for license %s: %s", lic.id, e)

    if count:
        db.commit()
        logger.info("Backfilled tpm_sealed_data for %d licenses", count)

    return count
