import logging
from app.config import settings

logger = logging.getLogger(__name__)

_redis_client = None
_redis_unavailable = False


def get_redis():
    """Return the Redis client or None if unavailable. Logs warnings on failure."""
    global _redis_client, _redis_unavailable
    if _redis_unavailable:
        return None
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            _redis_client.ping()
        except Exception as exc:
            logger.warning("Redis unavailable: %s", exc)
            _redis_unavailable = True
            _redis_client = None
            return None
    return _redis_client


def close_redis():
    global _redis_client, _redis_unavailable
    if _redis_client:
        try:
            _redis_client.close()
        except Exception:
            pass
    _redis_client = None
    _redis_unavailable = False
