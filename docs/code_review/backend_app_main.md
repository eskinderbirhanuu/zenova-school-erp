# File Reviewed

`backend/app/main.py` (233 lines)

## Overview

FastAPI application entry point. Middleware stack (CORS, security headers, CSRF, rate limiting, upload limits, metrics, request logging), router registration, exception handling, startup tasks (currency seeding, license validation, sync worker, scheduler), and graceful shutdown.

## Issues

### Issue 1 — Hardcoded CORS Origins + Environment Variable Merge

- **Lines:** 26-32
- **Severity:** Medium
- **Category:** Security
- **Description:** Three hardcoded localhost origins plus `ALLOWED_ORIGINS` env var appended at module level.
- **Why it is a problem:** Hardcoded debug IP `192.168.1.5:3000` is specific to one network and should not be in source code. Module-level list mutation at import time can cause race conditions or testing issues.
- **Potential Impact:** Low-security risk, but production origins should come exclusively from environment config.
- **Recommended Fix:** Move all origins to `settings.allowed_origins` and parse from there; remove hardcoded IP.

### Issue 2 — CSRF Enforcement Uses Cookie Comparison

- **Lines:** 91-112
- **Severity:** Medium
- **Category:** Security
- **Description:** CSRF protection compares `csrf_cookie` with `X-CSRF-Token` header. If neither is provided, the comparison `"" != ""` is `False`, so the request is rejected. However, if both are the same empty string, it would pass.
- **Why it is a problem:** The middleware doesn't validate that the token is well-formed or was actually issued by the server. Any attacker who can set a cookie (via XSS or subdomain) can bypass CSRF.
- **Potential Impact:** CSRF bypass if attacker can inject cookies.
- **Recommended Fix:** Use a signed CSRF token that includes a random nonce tied to the session, verified server-side.

### Issue 3 — CSRF Exempt Paths Include Sensitive Endpoints

- **Lines:** 75-87
- **Severity:** Medium
- **Category:** Security
- **Description:** Login, register, forgot-password, reset-password, and auth/refresh are all CSRF-exempt.
- **Why it is a problem:** While login endpoints commonly need CSRF exemption (no prior auth), the refresh endpoint being exempt means a CSRF attack can refresh tokens.
- **Potential Impact:** If an XSS or CSRF attack targets the refresh endpoint, a session could be hijacked.
- **Recommended Fix:** Consider double-submit cookie pattern for refresh endpoint instead of full exemption.

### Issue 4 — Global Exception Handler Re-raises in Development

- **Lines:** 117-137
- **Severity:** Medium
- **Category:** Security
- **Description:** In development mode, the exception handler re-raises the exception (`raise exc`), which will produce a stack trace in the response.
- **Why it is a problem:** If a production deployment mistakenly has `environment=development`, full stack traces could leak to end users.
- **Potential Impact:** Information disclosure (internal paths, SQL queries, environment variables).
- **Recommended Fix:** Remove re-raise; always return sanitized 500 and rely on logs for debugging.

### Issue 5 — Sync Worker Thread Runs Without Error Backoff

- **Lines:** 197-215
- **Severity:** Medium
- **Category:** Reliability
- **Description:** The sync worker has a hardcoded 300-second retry interval on errors, but on success it loops continuously with no delay.
- **Why it is a problem:** Continuous looping on success consumes CPU and database resources unnecessarily.
- **Potential Impact:** High CPU usage on idle systems; database queries every few milliseconds.
- **Recommended Fix:** Add `time.sleep(1)` or a configurable poll interval at the bottom of the success path.

### Issue 6 — License Validation in Startup Blocks Application Start

- **Lines:** 170-186
- **Severity:** Medium
- **Category:** Resilience
- **Description:** License validation runs synchronously during startup. If the license server is unreachable, startup is delayed.
- **Why it is a problem:** The application cannot serve requests until license validation completes (or fails). A temporary license server outage takes down the entire system.
- **Potential Impact:** Application unavailability during license server downtime.
- **Recommended Fix:** Validate license asynchronously on startup and cache the result; allow the app to start with a cached/in-memory grace period.

### Issue 7 — No Request Body Size Limit Middleware

- **Lines:** 70
- **Severity:** Low
- **Category:** Security
- **Description:** `UploadLimitMiddleware` is added but not visible in this file's imports to confirm parameters. No default body size limit for non-upload endpoints.
- **Why it is a problem:** Large JSON payloads (e.g., bulk student import) could exhaust server memory.
- **Potential Impact:** OOM (out of memory) DoS via large request bodies.
- **Recommended Fix:** Set `max_request_size` on all endpoints, not just file uploads.

### Issue 8 — Import Inside Function (watermark_middleware)

- **Line:** 144
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `import uuid` inside the middleware function, and `from app.services.watermark import ...` inside the request handler.
- **Why it is a problem:** Imports inside request handlers add latency to every request and bypass module-level import checks.
- **Potential Impact:** Slight performance overhead on every API request.
- **Recommended Fix:** Move imports to module level.

## Security Review

- **Strong points:** Comprehensive security headers (HSTS, CSP, X-Frame-Options, etc.), CSRF middleware (though improvable), forensic watermarks (`X-Zenova-Instance`, `X-Request-ID`), sanitized 500 error responses, rate limiting middleware, upload limits.
- **Weak points:** CSRF token validation is basic cookie comparison, hardcoded development origins, exception handler leaks in dev mode, no request body size limit.
- **Verdict:** Above average for a startup, but lacks enterprise-grade CSRF (signed tokens) and input size limits.

## Performance Review

- `SecurityHeadersMiddleware` applies headers conditionally (only to `/api/` and `/docs`), which is efficient.
- In-file imports in `watermark_middleware` add per-request overhead.
- Sync worker continuous loop needs a sleep/delay.
- Startup does sequential blocking operations (currency seed, license validation) — could be parallelized.

## Maintainability

- Clean middleware stack with clear ordering (CORS → Security → CSRF → Rate Limit → Upload → Metrics → Logging).
- CSRF exempt paths as a set — good.
- Startup logic mixes concerns (currency seeding, license check, sync worker, scheduler) — could be extracted into a service.

## Architecture Review

- Standard FastAPI application factory pattern.
- Middleware-heavy approach is correct for cross-cutting concerns.
- The sync worker as a daemon thread is a lightweight approach but lacks monitoring, restart logic, and graceful degradation.
- Startup logic would benefit from an orchestrator pattern (run, log, fail-open individually) rather than sequential synchronous execution.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
