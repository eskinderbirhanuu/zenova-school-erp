# File Reviewed

`backend/app/core/auth_deps.py` (136 lines)

## Overview

Authentication dependencies for FastAPI: `get_current_user` (cookie/Bearer token → User), `require_csrf` (double-submit cookie), `require_licensed_feature` (license-gated features), `require_inside_network` (trusted network check), and utility functions for client IP and user agent extraction.

## Issues

### Issue 1 — Token Blacklist Check Fails Open

- **Lines:** 23-28
- **Severity:** High
- **Category:** Security
- **Description:** `_is_token_blacklisted` returns `False` when Redis is unreachable (catches all exceptions).
- **Why it is a problem:** If Redis goes down, all revoked tokens become valid again. An attacker with a previously revoked token can regain access.
- **Potential Impact:** Token revocation becomes ineffective during Redis outages. Compromised sessions remain active.
- **Recommended Fix:** Log the Redis failure and consider returning `True` (fail closed) or using a local fallback cache for blacklisted JTIs.

### Issue 2 — Cookie-First Token Extraction Bypasses Authorization Header

- **Lines:** 32-37
- **Severity:** Medium
- **Category:** Security
- **Description:** `get_current_user` reads the `access_token` cookie first, then falls back to `Authorization: Bearer` header.
- **Why it is a problem:** If both are present, the cookie value takes precedence. HTTP-only cookies are generally more secure, but this precedence could be surprising.
- **Potential Impact:** An XSS attack that sets a cookie could override a legitimate Bearer token from a mobile app.
- **Recommended Fix:** In API paths, require Bearer header; in browser paths, require cookie. Use route-based differentiation.

### Issue 3 — `require_csrf` Compares Token Without Server-Side Validation

- **Lines:** 74-87
- **Severity:** Medium
- **Category:** Security
- **Description:** CSRF validation compares cookie value to header value, but neither is validated as having been issued by the server.
- **Why it is a problem:** Any attacker who can set a cookie via subdomain or XSS can pass CSRF checks by reflecting the cookie value in the header.
- **Potential Impact:** CSRF bypass in cross-origin attacks.
- **Recommended Fix:** Use a signed CSRF token with server-side validation (e.g., HMAC-signed with session-bound nonce).

### Issue 4 — `get_current_user` Creates Session Dependency but Doesn't Close on Error

- **Lines:** 31-71
- **Severity:** Low
- **Category:** Resource Management
- **Description:** The `get_db` dependency handles session lifecycle, but exceptions raised in `get_current_user` still go through FastAPI's cleanup.
- **Why it is a problem:** FastAPI properly closes sessions via dependency cleanup, but if `decode_token` or Redis calls fail, the transaction state could be inconsistent.
- **Potential Impact:** Minor — FastAPI's dependency injection handles cleanup, but edge cases could leave connections open.
- **Recommended Fix:** Ensure all exception paths return consistent session state (no partial mutations).

### Issue 5 — `require_licensed_feature` Lazy Imports `license_crypto` Inside Function

- **Line:** 112
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `from app.services.license_crypto import get_cached_license_status` is inside the dependency function.
- **Why it is a problem:** Lazy import hides a circular import that wouldn't exist if properly structured.
- **Potential Impact:** Import errors surface at runtime instead of startup.
- **Recommended Fix:** Move import to module level with proper dependency ordering.

### Issue 6 — `require_inside_network` Modifies User Object Without DB Transaction

- **Lines:** 125-136
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `current_user.is_view_only = True` modifies the SQLAlchemy model attribute in memory without saving to database.
- **Why it is a problem:** The `is_view_only` attribute is a transient modification that affects the current request but isn't persisted, potentially causing confusion about the user's actual state.
- **Potential Impact:** The modification is lost after the request; other handlers might rely on `is_view_only` being a database-backed field.
- **Recommended Fix:** Track view-only status in request state (`request.state.is_view_only = True`) rather than mutating the ORM model.

### Issue 7 — `get_client_ip` `split(",")[0]` May Not Be the Real Client IP

- **Lines:** 12-16
- **Severity:** Medium
- **Category:** Security
- **Description:** `X-Forwarded-For` is parsed as `split(",")[0]`. An attacker can set `X-Forwarded-For` header to impersonate an IP.
- **Why it is a problem:** If the app is behind a proxy, `X-Forwarded-For` might contain multiple IPs. The first value is the client. However, if the app is directly exposed, an attacker can set an arbitrary `X-Forwarded-For` to spoof their IP.
- **Potential Impact:** IP-based access controls (trusted networks) could be bypassed.
- **Recommended Fix:** Use only the last proxy's reported IP (or `X-Real-IP` if nginx is configured), or validate against the trusted proxy list.

## Security Review

- **Strong points:** Token type verification (`type == "access"`), JTI blacklist check, CSRF middleware for state-changing requests, trusted network IP validation, license-gated features.
- **Weak points:** Blacklist fails open (Redis down = all tokens valid), CSRF uses unsigned cookie comparison, view-only status mutation on ORM object, IP spoofing via X-Forwarded-For.
- **Verdict:** Good security foundation but with several fail-open patterns that reduce protection in degraded states.

## Performance Review

- Redis lookup for every request to check token blacklist could add latency. Consider caching blacklist status in-memory with a short TTL.
- IP network matching loops through CIDRs — fine for small networks lists.
- Lazy imports add slight overhead.

## Maintainability

- Clean function signatures with type hints.
- Well-commented docstrings.
- `_is_token_blacklisted` and `_ip_in_networks` are private helpers — good encapsulation.

## Architecture Review

- Uses FastAPI `Depends()` pattern correctly.
- Token decoding logic is delegated to `auth_service` — good separation.
- `require_licensed_feature` as a factory function returning `Depends()` is a clean pattern.
- User model mutation for view-only status is an architectural smell.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 7/10 |
