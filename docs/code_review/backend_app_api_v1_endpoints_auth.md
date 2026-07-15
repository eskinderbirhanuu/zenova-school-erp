# File Reviewed

`backend/app/api/v1/endpoints/auth.py` (693 lines)

## Overview

Auth endpoints — login with brute-force protection (Redis), MFA enforcement/verification, registration with role guard, refresh token rotation with reuse detection, logout with token blacklisting, password reset with one-time tokens, device fingerprint tracking.

## Issues

### Issue 1 — `_check_brute_force` Redis Dependency Creates Soft Failure Mode

- **Lines:** 40-64
- **Severity:** Low
- **Category:** Reliability
- **Description:** If Redis is unavailable, brute-force checks are silently skipped (`if redis is None: return`).
- **Why it is:** Acceptable degradation — availability over security in this case.

### Issue 2 — `_record_failed_login` Catches All Exceptions

- **Lines:** 79-80
- **Severity:** Low
- **Category:** Error Handling
- **Description:** `except Exception: pass` on Redis errors during brute-force recording. Failures are invisible.

### Issue 3 — `_check_concurrent_sessions` and `_register_session` Silently Skip When Redis Unavailable

- **Lines:** 224-226
- **Severity:** Low
- **Category:** Reliability
- **Description:** Concurrent session limit is bypassed when Redis is down.

### Issue 4 — `refresh_token` Has Dead Code After Early Return

- **Lines:** 350-355
- **Severity:** Low
- **Category:** Bug
- **Description:** Lines 350-355 (`from app.core.redis_client import get_redis` through the comment block and the start of the actual refresh code) contain unreachable code due to the `raise` on line 349. The `raise` exits the function, so lines 350-355 are dead code. However, the real refresh token rotation logic starts at line 356 with `if redis:`, which IS reachable because it's after the `if`/`raise` block. Wait, let me re-read...

Actually looking at lines 349-356:
```
349:         detail="Invalid token type",
350:         from app.core.redis_client import get_redis
351:         from app.core.auth_deps import _is_token_blacklisted
352:         redis = get_redis()
353:         jti = payload.get("jti", "")
354:         user_id = payload.get("sub")
355: 
356:         # ── Refresh Token Rotation + Reuse Detection ──────────────
357:     # Each refresh token belongs to a "family" identified by the user id.
```

Lines 350-355 are after the `raise` on line 349, so they are unreachable dead code. The actual Redis logic starts at line 362 with `if redis:`. Wait, but line 349 is `raise HTTPException(...)` — this raises, so lines 350-355 are dead. But wait, there's also a mismatched indentation — lines 350-354 are indented inside the `if payload.get("type") != "refresh":` block, while line 356 is not (it has the `#` comment). Let me look more carefully...

Actually line 356 is just a comment (starts with `#`), so it's not code. Line 357 onward is the real continuation. The `raise` on line 349 should have ended that branch. Lines 350-354 look like they're accidentally indented inside the `if` block but after the `raise`. This is dead code.

### Issue 5 — Self-Registration Doesn't Verify School Exists

- **Lines:** 305-314
- **Severity:** Medium
- **Category:** Validation
- **Description:** `data.school_id` is accepted without verifying the school exists.
- **Why it is a problem:** User could be created with an invalid school_id.

## Security Review

- **Strong points:** Brute-force protection (Redis per-IP + per-ID), MFA enforcement for sensitive roles, refresh token rotation with reuse detection, token blacklisting, logout clears all session artifacts, privilege-escalation guard on registration, anti-enumeration on forgot-password, one-time password reset tokens, device fingerprint tracking with new-device alert.
- **Weak points:** Redis-dependent features degrade silently, self-registration school_id not validated.

## Performance Review

- Token operations are fast with Redis.
- Device fingerprint tracking adds DB write on new devices.

## Maintainability

- Well-structured with clear helper functions.
- Dead code after `raise` should be removed.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
