# File Reviewed

`backend/app/core/security.py` (131 lines)

## Overview

Core security utilities: password hashing (bcrypt), password strength validation, JWT creation/decoding (access, refresh, password-reset tokens), and offline password recovery codes (HMAC-signed, TTL-bound).

## Issues

### Issue 1 — JWT Algorithm Used Directly, No RS256 Fallback

- **Lines:** 53, 62, 76, 81
- **Severity:** Medium
- **Category:** Security
- **Description:** All JWT operations use `settings.algorithm` directly. RS256 support exists in `settings` but is not consumed here.
- **Why it is a problem:** The `decode_access_token` function doesn't try RS256 if HS256 fails, and `create_access_token` only uses the configured algorithm. If RS256 keys are set, they are ignored.
- **Potential Impact:** JWT tokens are signed with HS256 even when RS256 keys are configured (false sense of security).
- **Recommended Fix:** Update `encode`/`decode` to prefer RS256 when `jwt_private_key`/`jwt_public_key` are set, falling back to HS256 only when keys are absent.

### Issue 2 — `decode_access_token` Silently Returns None on Any Error

- **Lines:** 79-84
- **Severity:** Low
- **Category:** Error Handling
- **Description:** All exceptions (expired token, invalid signature, malformed token, etc.) are caught and return `None`.
- **Why it is a problem:** Callers cannot distinguish between an expired token, a forged token, or a malformed token. This prevents giving users specific error messages.
- **Potential Impact:** Poor user experience — "session expired" vs "invalid token" cannot be differentiated.
- **Recommended Fix:** Return a result type or raise specific exceptions (expired, invalid, malformed) for callers to handle.

### Issue 3 — Hardcoded `BCRYPT_ROUNDS = 12` Instead of Using Setting

- **Line:** 9
- **Severity:** Low
- **Category:** Configuration
- **Description:** `BCRYPT_ROUNDS` is hardcoded but `settings.bcrypt_rounds` exists in config.
- **Why it is a problem:** Configuration is duplicated. If someone changes `bcrypt_rounds` in the env file, it has no effect.
- **Potential Impact:** Potential inconsistency — operator expects 14 rounds but gets 12.
- **Recommended Fix:** Use `settings.bcrypt_rounds` instead of hardcoded constant.

### Issue 4 — Password Recovery Code: `_recovery_secret` Uses SHA-256 of Secret Key

- **Lines:** 97-99
- **Severity:** Low
- **Category:** Security
- **Description:** Recovery code signing key is derived as `SHA256("recovery:" + secret_key)`. If the secret key is compromised, all recovery codes can be forged.
- **Why it is a problem:** This is a reasonable derivation, but there's no domain separation from other uses of SHA256(secret_key).
- **Potential Impact:** If an attacker obtains the secret key, they can forge recovery codes. This is acceptable (they already have the keys to the kingdom).
- **Recommended Fix:** Use HKDF or a proper KDF for key derivation to ensure domain separation.

### Issue 5 — No Rate Limiting on `verify_password_recovery_code`

- **Lines:** 113-131
- **Severity:** Medium
- **Category:** Security
- **Description:** Recovery code verification has no rate limiting or attempt tracking.
- **Why it is a problem:** An attacker can brute-force recovery codes (6-digit TOTP-like codes) with unlimited attempts.
- **Potential Impact:** Account takeover via recovery code brute-force.
- **Recommended Fix:** Rate-limit recovery code attempts per user (e.g., max 5 attempts per hour).

### Issue 6 — `verify_password` Swallows All Exceptions

- **Line:** 16
- **Severity:** Low
- **Category:** Error Handling
- **Description:** If `pwd_context.verify` throws an exception (e.g., invalid hash format), the function returns `False`.
- **Why it is a problem:** Silent failure could mask database corruption or hash format issues.
- **Potential Impact:** Debugging hash migration issues becomes difficult.
- **Recommended Fix:** Log the exception before returning False, or let it propagate to a global handler.

### Issue 7 — `re` Imported But Only Used Once

- **Line:** 5
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `import re` is at the top but `re` is only used in `PASSWORD_POLICY` compilation.
- **Why it is a problem:** Minor — import is fine.
- **Potential Impact:** None. Minor import style observation.

## Security Review

- **Strong points:** Password policy (uppercase, lowercase, digit, special, 8-128 chars), common password blacklist, bcrypt with explicit `ident="2b"`, separate token types (access, refresh, password_reset) to prevent token reuse, JWT `jti` claim for token tracking, HMAC-signed recovery codes with TTL.
- **Weak points:** No RS256 fallback, recovery code brute-force not rate-limited, decode returns None for all error types.
- **Verdict:** Strong security foundation with appropriate cryptography choices. The RS256 gap and recovery rate-limiting are the main concerns.

## Performance Review

- All operations are fast: bcrypt (with 12 rounds, 200-300ms), HMAC, SHA-256.
- No performance concerns.

## Maintainability

- Clean function-level separation with clear responsibilities.
- Inline imports (`hmac`, `hashlib`, `time`) at bottom of file instead of top — unconventional but functional.
- Recovery code functions are well-documented with inline comments.

## Architecture Review

- Functions follow single-responsibility: one function = one operation.
- JWT operations are centralized rather than scattered across services — good.
- The `_recovery_secret()` derivation could be extracted to a configuration concern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 9/10 |
| Security | 8/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 8/10 |
