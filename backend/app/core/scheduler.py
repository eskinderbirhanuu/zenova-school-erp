import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _nightly_archive():
    logger.info("Nightly archive job started")
    try:
        from app.database import SessionLocal
        from app.services.archive_service import run_archive
        db = SessionLocal()
        try:
            result = run_archive(db)
            logger.info("Nightly archive complete: %s", result)
        except Exception:
            logger.exception("Nightly archive failed")
            db.rollback()
        finally:
            db.close()
    except Exception:
        logger.exception("Nightly archive: failed to acquire DB session")


def _nightly_backup():
    logger.info("Nightly backup job started")
    try:
        from app.services.backup_service import create_backup
        entry = create_backup()
        logger.info("Nightly backup complete: %s", entry.get("filename", "unknown"))
    except Exception:
        logger.exception("Nightly backup failed")


def _heartbeat_check():
    logger.info("License heartbeat check started")
    try:
        from app.database import SessionLocal
        from app.services.heartbeat_service import run_heartbeat_if_due
        db = SessionLocal()
        try:
            result = run_heartbeat_if_due(db)
            if result:
                logger.info("Heartbeat sent: %s", result.get("status"))
        except Exception:
            logger.exception("Heartbeat check failed")
        finally:
            db.close()
    except Exception:
        logger.exception("Heartbeat: failed to acquire DB session")


def _daily_fee_calculation():
    logger.info("Daily platform fee calculation started")
    try:
        from app.database import SessionLocal
        from app.services.platform_commission_service import run_daily_fee_calculation
        db = SessionLocal()
        try:
            count = run_daily_fee_calculation(db)
            logger.info("Daily fee calculation complete: %d fees recorded", count)
        except Exception:
            logger.exception("Daily fee calculation failed")
            db.rollback()
        finally:
            db.close()
    except Exception:
        logger.exception("Daily fee calculation: failed to acquire DB session")


def _cleanup_stale_sessions():
    logger.info("Stale payment session cleanup started")
    try:
        from app.database import SessionLocal
        from datetime import timedelta
        from app.models.payment_session import PaymentSession
        db = SessionLocal()
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            stale = db.query(PaymentSession).filter(
                PaymentSession.status == "pending",
                PaymentSession.expires_at < cutoff,
            ).all()
            for s in stale:
                s.status = "cancelled"
            db.commit()
            logger.info("Cleaned up %d stale payment sessions", len(stale))
        except Exception:
            logger.exception("Stale session cleanup failed")
            db.rollback()
        finally:
            db.close()
    except Exception:
        logger.exception("Stale session cleanup: failed to acquire DB session")


def _enforce_grace_periods():
    logger.info("Offline grace period enforcement started")
    try:
        from app.database import SessionLocal
        from app.services.grace_period_enforcer import enforce_offline_grace_periods
        db = SessionLocal()
        try:
            count = enforce_offline_grace_periods(db)
            if count:
                logger.info("Grace period enforcement: %d licenses expired", count)
        except Exception:
            logger.exception("Grace period enforcement failed")
            db.rollback()
        finally:
            db.close()
    except Exception:
        logger.exception("Grace period enforcement: failed to acquire DB session")


def _backfill_tpm_data():
    logger.info("TPM data backfill job started")
    try:
        from app.database import SessionLocal
        from app.services.backfill_tpm import backfill_tpm_sealed_data
        db = SessionLocal()
        try:
            count = backfill_tpm_sealed_data(db)
            if count:
                logger.info("TPM backfill: %d licenses updated", count)
        except Exception:
            logger.exception("TPM backfill failed")
            db.rollback()
        finally:
            db.close()
    except Exception:
        logger.exception("TPM backfill: failed to acquire DB session")


def _archive_device_changes():
    logger.info("Device change request archive job started")
    try:
        from app.database import SessionLocal
        from app.services.device_review_service import archive_old_device_changes
        db = SessionLocal()
        try:
            count = archive_old_device_changes(db)
            logger.info("Device change archive complete: %d archived", count)
        except Exception:
            logger.exception("Device change archive failed")
            db.rollback()
        finally:
            db.close()
    except Exception:
        logger.exception("Device change archive: failed to acquire DB session")


def _monthly_invoice_generation():
    logger.info("Monthly platform invoice generation started")
    try:
        from app.database import SessionLocal
        from app.services.platform_commission_service import run_monthly_invoice_generation
        db = SessionLocal()
        try:
            invoices = run_monthly_invoice_generation(db)
            logger.info("Monthly invoice generation complete: %d invoices created", len(invoices))
        except Exception:
            logger.exception("Monthly invoice generation failed")
            db.rollback()
        finally:
            db.close()
    except Exception:
        logger.exception("Monthly invoice generation: failed to acquire DB session")


def start_scheduler():
    scheduler.add_job(
        _nightly_archive,
        CronTrigger(hour=2, minute=0),
        id="nightly_archive",
        replace_existing=True,
        name="Archive old records (2:00 AM)",
    )
    scheduler.add_job(
        _nightly_backup,
        CronTrigger(hour=3, minute=0),
        id="nightly_backup",
        replace_existing=True,
        name="Database backup (3:00 AM)",
    )
    scheduler.add_job(
        _cleanup_stale_sessions,
        CronTrigger(hour="*/2", minute=0),
        id="cleanup_stale_sessions",
        replace_existing=True,
        name="Cancel stale payment sessions (every 2 hours)",
    )
    scheduler.add_job(
        _heartbeat_check,
        CronTrigger(hour="*/6"),
        id="heartbeat_check",
        replace_existing=True,
        name="License server heartbeat (every 6 hours)",
    )
    scheduler.add_job(
        _daily_fee_calculation,
        CronTrigger(hour=23, minute=30),
        id="daily_fee_calculation",
        replace_existing=True,
        name="Calculate platform fees (11:30 PM)",
    )
    scheduler.add_job(
        _backfill_tpm_data,
        CronTrigger(hour=5, minute=30),
        id="backfill_tpm_data",
        replace_existing=True,
        name="Backfill TPM sealed data for existing licenses (daily 5:30 AM)",
    )
    scheduler.add_job(
        _enforce_grace_periods,
        CronTrigger(hour="*/4", minute=15),
        id="enforce_grace_periods",
        replace_existing=True,
        name="Expire licenses past offline grace period (every 4 hours)",
    )
    scheduler.add_job(
        _archive_device_changes,
        CronTrigger(day="*", hour=4, minute=0),
        id="archive_device_changes",
        replace_existing=True,
        name="Archive old device change requests (daily 4:00 AM)",
    )
    scheduler.add_job(
        _monthly_invoice_generation,
        CronTrigger(day=1, hour=1, minute=0),
        id="monthly_invoice_generation",
        replace_existing=True,
        name="Generate monthly platform invoices (1st, 1:00 AM)",
    )
    scheduler.start()
    logger.info("Scheduler started — archive 2AM, backup 3AM, fees 11:30PM, invoices 1st 1AM")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
