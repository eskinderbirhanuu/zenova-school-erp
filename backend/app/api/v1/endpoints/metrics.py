from fastapi import APIRouter, Request, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from sqlalchemy import text, func
from app.database import get_db
from sqlalchemy.orm import Session
from app.core.redis_client import get_redis
from app.models.sync_queue import SyncQueue
from app.models.user import User

router = APIRouter(tags=["metrics"])

requests_total = Counter(
    "zenova_requests_total", "Total request count",
    ["method", "path", "status"],
)
request_latency = Histogram(
    "zenova_request_latency_seconds", "Request latency in seconds",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)
active_requests = Gauge("zenova_active_requests", "Currently active requests")
db_up = Gauge("zenova_db_up", "Database connectivity (1=up, 0=down)")
redis_up = Gauge("zenova_redis_up", "Redis connectivity (1=up, 0=down)")
sync_pending_gauge = Gauge("zenova_sync_pending", "Pending sync queue items")
user_count = Gauge("zenova_users_total", "Total registered users")


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/api/v1/metrics":
            return await call_next(request)
        path = request.url.path
        method = request.method
        active_requests.inc()
        t0 = time.perf_counter()
        response = None
        try:
            response = await call_next(request)
            return response
        finally:
            elapsed = time.perf_counter() - t0
            status = str(response.status_code) if response is not None else "500"
            requests_total.labels(method=method, path=path, status=status).inc()
            request_latency.labels(method=method, path=path).observe(elapsed)
            active_requests.dec()


@router.get("/metrics")
async def metrics(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_up.set(1)
    except Exception:
        db_up.set(0)

    try:
        r = get_redis()
        r.ping()
        redis_up.set(1)
    except Exception:
        redis_up.set(0)

    try:
        pending = db.query(func.count(SyncQueue.id)).filter(
            SyncQueue.status.in_(["pending", "retrying"])
        ).scalar() or 0
        sync_pending_gauge.set(pending)
    except Exception:
        sync_pending_gauge.set(-1)

    try:
        total = db.query(func.count(User.id)).scalar() or 0
        user_count.set(total)
    except Exception:
        user_count.set(-1)

    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


_start_time = time.time()
