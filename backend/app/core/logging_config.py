import json
import logging
import sys
from datetime import datetime, timezone


class RequestIDFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        from app.core.request_id_middleware import get_request_id
        record.request_id = get_request_id() or "-"
        return True


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def configure_logging(environment: str = "development"):
    root = logging.getLogger()
    root.setLevel(logging.INFO if environment == "production" else logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    if environment == "production":
        handler.setFormatter(JSONFormatter())
        handler.addFilter(RequestIDFilter())
    else:
        handler.setFormatter(logging.Formatter(
            "[%(asctime)s] [%(request_id)s] %(levelname)-8s %(name)s — %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        handler.addFilter(RequestIDFilter())
    root.handlers.clear()
    root.addHandler(handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return logging.getLogger(__name__)
