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
    scheduler.start()
    logger.info("Scheduler started — archive at 2:00 AM, backup at 3:00 AM")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
