from fastapi import APIRouter, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time

router = APIRouter(tags=["metrics"])

_metrics = {
    "requests_total": 0,
    "requests_by_method": {},
    "requests_by_path": {},
    "requests_by_status": {},
    "latency_sum_ms": 0.0,
    "latency_count": 0,
}


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/api/v1/metrics":
            return await call_next(request)
        t0 = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - t0) * 1000

        _metrics["requests_total"] += 1
        method = request.method
        _metrics["requests_by_method"][method] = _metrics["requests_by_method"].get(method, 0) + 1

        path = request.url.path
        _metrics["requests_by_path"][path] = _metrics["requests_by_path"].get(path, 0) + 1

        status_group = f"{response.status_code // 100}xx"
        _metrics["requests_by_status"][status_group] = _metrics["requests_by_status"].get(status_group, 0) + 1

        _metrics["latency_sum_ms"] += elapsed
        _metrics["latency_count"] += 1

        return response


@router.get("/metrics")
def metrics():
    avg_latency = 0.0
    if _metrics["latency_count"] > 0:
        avg_latency = _metrics["latency_sum_ms"] / _metrics["latency_count"]
    return {
        "requests_total": _metrics["requests_total"],
        "requests_by_method": _metrics["requests_by_method"],
        "requests_by_status": _metrics["requests_by_status"],
        "avg_latency_ms": round(avg_latency, 2),
        "uptime_seconds": round(time.time() - _start_time, 1) if _start_time else 0,
    }


_start_time = time.time()
