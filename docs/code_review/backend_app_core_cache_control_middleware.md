# File Reviewed

`backend/app/core/cache_control_middleware.py` (13 lines)

## Overview

Middleware to set `Cache-Control: no-store` headers on all successful GET/HEAD responses.

## Issues

### Issue 1 — Middleware Is Defined but Never Used

- **Lines:** 1-13
- **Severity:** Medium
- **Category:** Code Quality — Dead Code
- **Description:** `CacheControlMiddleware` is never imported or added in `main.py`. The `SecurityHeadersMiddleware` already handles cache headers (main.py:63).
- **Why it is a problem:** Dead code that is never executed. Creates confusion for developers reading the codebase.
- **Potential Impact:** No production impact, but wastes developer attention during onboarding.
- **Recommended Fix:** Remove the file or register it if the intent was to apply cache headers to non-API paths.

### Issue 2 — Duplicates SecurityHeadersMiddleware Behavior

- **Lines:** 9-11
- **Severity:** Low
- **Category:** Code Quality — DRY
- **Description:** Sets the same cache headers that `SecurityHeadersMiddleware` already sets (main.py:63).
- **Why it is a problem:** Duplicate middleware that may conflict or override each other.
- **Potential Impact:** If both were active, `CacheControlMiddleware` would run first (or last, depending on order) and could conflict.

## Security Review

- Adding `Cache-Control: no-store` to GET responses prevents caching of dynamic content — good practice for software that handles financial/student data.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 5/10 |
| Security | 8/10 |
| Performance | 10/10 |
| Readability | 10/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |

**Note:** Score reflects dead code status. The concept is correct but the file is orphaned.
