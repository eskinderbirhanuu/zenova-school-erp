# File Reviewed

`backend/app/core/rate_limit.py` (38 lines)

## Overview

Rate-limiting dependency factory. Uses Redis to track request counts per IP per time window. Pre-configured limits for auth (10/60s), login (5/300s), and API (200/60s).

## Issues

### Issue 1 — Rate Limit Exceeded on First Request After TTL Expiry

- **Lines:** 17-19
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `redis.get(key)` returns `None` only when the key has expired. But there's a TOCTOU (time-of-check-time-of-use) race: if `current is None`, it sets a new key. If two requests arrive simultaneously, both could see `None` and set separate keys.
- **Why it is a problem:** Race condition allows burst rate-limit bypass at low traffic or after key expiry.
- **Potential Impact:** A clever attacker can send two requests at the exact moment a window expires to double their allowed rate.
- **Recommended Fix:** Use Redis `INCR` with `EXPIRE` in a Lua script for atomic increment-and-expire, or use `redis.incr(key)` first and check the result.

### Issue 2 — Rate Limit Fails Open on Redis Error

- **Lines:** 30-31
- **Severity:** High
- **Category:** Security
- **Description:** Any exception during rate limiting (except `HTTPException`) is silently caught and ignored via `except Exception: pass`.
- **Why it is a problem:** If Redis goes down, all rate limiting is disabled. The application becomes vulnerable to brute-force and DoS attacks.
- **Potential Impact:** An attacker can launch unlimited login attempts, API calls, etc. during a Redis outage.
- **Recommended Fix:** Log the exception and consider raising HTTP 503 (Service Unavailable) on critical endpoints, or fail-closed for auth operations.

### Issue 3 — `rate_limit` Returns `ip` but Callers Ignore It

- **Lines:** 27-32
- **Severity:** Low
- **Category:** Code Quality
- **Description:** The `_check` function returns `ip` (the client's IP), but callers (`rate_limit_middleware.py`) ignore the return value.
- **Why it is a problem:** Unused return value. If IP is needed, middleware can extract it separately.
- **Potential Impact:** Minimal — just dead code in terms of the returned value.
- **Recommended Fix:** Remove the return value or use it for logging in the middleware.

### Issue 4 — No Rate Limit Key Includes User ID

- **Line:** 7
- **Severity:** Low
- **Category:** Architecture
- **Description:** The rate limit key is `ratelimit:{prefix}:{ip}` — only by IP, not by user.
- **Why it is a problem:** Users behind NAT (e.g., entire school on one IP) will share the same rate limit bucket.
- **Potential Impact:** Legitimate users from the same network can rate-limit each other.
- **Recommended Fix:** Add user ID to the key when available (e.g., `ratelimit:{prefix}:{ip}:{user_id}`).

## Security Review

- **Strong points:** Separate limits for auth, login, and general API. Sliding window via TTL-based expiry. Retry-After header on 429 responses.
- **Weak points:** Fails open on Redis outage (critical), race condition on new window, no user-based limiting.
- **Verdict:** Good rate limiting for normal operation, but Redis-dependent reliability is a single point of failure.

## Performance Review

- Single Redis GET/INCR per request — negligible overhead.
- Pre-configured limits (200 req/min for API) are reasonable for the expected load.

## Maintainability

- Very short, clean implementation.
- Factory pattern (`rate_limit()` returns a callable) is clean and reusable.
- Pre-configured instances at module level are easy to use.

## Architecture Review

- Dependency-based rate limiting (as opposed to middleware-only) allows per-endpoint customization.
- Combining middleware (global) and dependency (per-route) rate limiting creates layered defense.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 6/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 6/10 |
