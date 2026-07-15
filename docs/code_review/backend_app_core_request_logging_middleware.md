# File Reviewed

`backend/app/core/request_logging_middleware.py` (31 lines)

## Overview

Request logging middleware that logs method, path, status code, duration, and client IP for all `/api/` requests. Adds `X-Request-ID` header to responses.

## Issues

### Issue 1 — `X-Request-ID` Set Twice

- **Line:** 30
- **Severity:** Low
- **Category:** Code Quality
- **Description:** This middleware sets `X-Request-ID`. The `watermark_middleware` in `main.py:150` also sets `X-Request-ID`. The last one to execute wins.
- **Why it is a problem:** The request ID generated here is overwritten by `watermark_middleware`, making the one in the log inconsistent with the one in the response header.
- **Potential Impact:** When debugging, the request ID in the logs won't match the ID in the response header.
- **Recommended Fix:** Have only one middleware set `X-Request-ID` (preferably `watermark_middleware` since it also sets other forensic headers), or ensure they coordinate.

### Issue 2 — Log Format Doesn't Include Request ID

- **Lines:** 25-28
- **Severity:** Low
- **Category:** Observability
- **Description:** The log line includes `request_id` but it's generated here and not yet in the response (it's set in `response.headers` after the log line).
- **Why it is a problem:** If another system aggregates logs by request ID, the ID in the log entry ($request_id) won't match the ID in the response header because `watermark_middleware` overwrites it.
- **Potential Impact:** Log correlation difficulties.
- **Recommended Fix:** Consolidate request ID generation in one place.

### Issue 3 — No Error Logging for Failed Requests

- **Lines:** 22-28
- **Severity:** Low
- **Category:** Observability
- **Description:** The middleware logs all requests at `INFO` level regardless of status code. There's no special handling for 4xx/5xx responses.
- **Why it is a problem:** Error responses are not differentiated from successful ones in logs, making it harder to filter for errors.
- **Potential Impact:** Operators must search through all log lines to find errors.
- **Recommended Fix:** Log at `WARNING` level for 4xx and `ERROR` level for 5xx responses.

## Security Review

- Logs client IP from `request.client.host` — this is the direct connection IP. If behind a proxy, it logs the proxy's IP, not the real client. Consider using `get_client_ip()` from `auth_deps.py`.

## Performance Review

- `time.perf_counter()` has high resolution — good for accurate timing.
- UUID generation per request adds ~0.1ms — negligible.

## Maintainability

- Very short and clean (31 lines).
- Single clear responsibility.

## Architecture Review

- Middleware is the correct layer for request logging.
- The duplication of `X-Request-ID` with `watermark_middleware` is an architectural defect that should be resolved.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 9/10 |
| Readability | 10/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 7/10 |
