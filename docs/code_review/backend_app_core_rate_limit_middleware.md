# File Reviewed

`backend/app/core/rate_limit_middleware.py` (33 lines)

## Overview

Global rate-limiting middleware that applies the API rate limit (200 req/min) to all `/api/v1/` endpoints, with exempt paths for auth, health, setup, and activate endpoints.

## Issues

### Issue 1 — Exempt Path Set Includes `/api/v1/health/` But Not `/api/v1/health/live` and `/api/v1/health/ready`

- **Lines:** 12-13
- **Severity:** Low
- **Category:** Configuration
- **Description:** Both `/api/v1/health/` and `/api/v1/health/live` and `/api/v1/health/ready` are in the exempt set. But `/api/v1/health` (without trailing slash) is not exempt.
- **Why it is a problem:** If a health checker uses `/api/v1/health` without a trailing slash, it could be rate-limited, causing false unhealthy alerts.
- **Potential Impact:** False positive health check failures in monitoring.
- **Recommended Fix:** Use `startswith("/api/v1/health")` instead of explicit path matching.

### Issue 2 — Same Fail-Open on Redis Error as rate_limit.py

- **Lines:** 26-32
- **Severity:** High
- **Category:** Security
- **Description:** The middleware catches all exceptions from `API_RATE_LIMIT` (except `HTTPException`) and silently continues.
- **Why it is a problem:** Redis failure silently disables all rate limiting for all API endpoints.
- **Potential Impact:** Unbounded API access during Redis downtime, enabling brute-force and DoS attacks.
- **Recommended Fix:** Log the error and consider short-circuiting to a 503 response for non-exempt paths.

### Issue 3 — No Path Prefix Variant for Activate Paths

- **Lines:** 15-16
- **Severity:** Low
- **Category:** Architecture
- **Description:** `/api/v1/activate/validate` and `/api/v1/activate/status` are exempt, but other activate subpaths (e.g., `/api/v1/activate/validate-type`) are not.
- **Why it is a problem:** Inconsistent rate limiting on activate endpoints.
- **Potential Impact:** Customer activation flow could be rate-limited unintentionally.
- **Recommended Fix:** Use `startswith("/api/v1/activate/")` to exempt all activation endpoints.

## Security Review

- Exempting auth endpoints from rate limiting is a trade-off: auth needs to be available, but it's the most common brute-force target. The `LOGIN_RATE_LIMIT` (5/300s) dependency on the login endpoint handles this separately.
- The middleware re-raises `HTTPException` from `API_RATE_LIMIT`, which FastAPI will convert to a 429 response — correct behavior.

## Performance Review

- Single function call per request — negligible overhead.
- Path matching uses set lookup (O(1)) for exempt paths.

## Maintainability

- Very short, easy to understand.
- The exempt path set is clear and easy to modify.

## Architecture Review

- Middleware provides global rate limiting. Per-endpoint `rate_limit()` dependencies provide granular control. Correct layered approach.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 6/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 6/10 |
