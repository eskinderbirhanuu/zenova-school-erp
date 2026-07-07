import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.license import License, LicenseStatus
from app.services.license_crypto import get_environment_grace_days, get_active_environment
from app.core.audit import log_audit

logger = logging.getLogger(__name__)


def enforce_offline_grace_periods(db: Session) -> int:
    """Expire licenses whose offline grace period has been exceeded.

    Finds all ACTIVE licenses with offline_grace_start set where
    (now - offline_grace_start).days exceeds the environment-aware grace period.
    Returns the count of licenses expired.
    """
    now = datetime.now(timezone.utc)
    expired_count = 0

    licenses = db.query(License).filter(
        License.status == LicenseStatus.ACTIVE,
        License.offline_grace_start.isnot(None),
    ).all()

    for lic in licenses:
        env = lic.runtime_environment or get_active_environment()
        max_grace = get_environment_grace_days(env)
        grace_days = (now - lic.offline_grace_start).days

        if grace_days > max_grace:
            lic.status = LicenseStatus.EXPIRED
            log_audit(
                db, "system", "LICENSE_EXPIRED", "licenses",
                lic.id,
                new_data={
                    "reason": f"Offline grace period exceeded ({grace_days} days, max {max_grace} for {env})",
                    "offline_grace_start": lic.offline_grace_start.isoformat(),
                },
            )
            expired_count += 1

    if expired_count:
        db.commit()
        logger.info("Expired %d licenses past offline grace period", expired_count)

    return expired_count
