import signal
import sys
import os
import logging
import threading
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.services import sync_service

logger = logging.getLogger(__name__)

_shutdown = threading.Event()


def _signal_handler(signum, frame):
    logger.info("Received signal %s — draining sync queue...", signum)
    _shutdown.set()


def run(interval: int = 30):
    signal.signal(signal.SIGTERM, _signal_handler)
    signal.signal(signal.SIGINT, _signal_handler)

    logger.info("Starting sync worker — processing queue every %ss", interval)
    while not _shutdown.is_set():
        try:
            db = SessionLocal()
            result = sync_service.process_queue(db)
            db.close()
            if result.get("error"):
                logger.warning("Sync worker: %s", result["error"])
            elif result["synced"] > 0 or result["failed"] > 0:
                logger.info("synced=%s failed=%s pending=%s",
                            result["synced"], result["failed"], result["pending_remaining"])
        except Exception as e:
            logger.exception("Sync worker error: %s", e)
        if _shutdown.wait(timeout=interval):
            break
    logger.info("Sync worker shutdown complete")


if __name__ == "__main__":
    interval = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    run(interval)
