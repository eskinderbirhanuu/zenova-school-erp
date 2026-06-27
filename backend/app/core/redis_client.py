import redis
from app.config import settings

_redis_client = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
    return _redis_client


def close_redis():
    global _redis_client
    if _redis_client:
        _redis_client.close()
        _redis_client = None
