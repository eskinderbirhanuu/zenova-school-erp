# 07 — AUTHENTICATION AUDIT

**Generated:** 2026-07-11
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

ZENOVA implements a comprehensive authentication system with JWT access/refresh tokens, bcrypt password hashing, TOTP-based MFA with backup codes, password reset with email + recovery codes, brute-force protection via Redis, refresh token rotation with reuse detection, logout with token blacklisting, and device/IP tracking. The system is production-ready and covers all essential auth flows.

**Score:** 9.0/10

---

## Current Implementation

### JWT Tokens

| Token Type | Algorithm | Typical TTL | Purpose |
|-----------|-----------|-------------|---------|
| access_token | HS256 | 30 min | API authentication |
| refresh_token | HS256 | 7 days | Token renewal |
| mfa_step_up | HS256 | Short-lived | MFA intermediate token |
| password_reset | HS256 | 15 min | Password reset link |

Tokens contain:
- `sub`: user UUID
- `role`: role name (access_token only)
- `exp`: expiry timestamp
- `type`: token type discriminator (prevents token type confusion)
- `jti`: unique token ID (32-char hex) for blacklisting/rotation
- `purpose`: for reset tokens (additional discriminator)

### Token Delivery

- **access_token**: HttpOnly, Secure (production), SameSite=strict cookie + Bearer header
- **refresh_token**: HttpOnly, Secure, SameSite=strict cookie
- **user_role**: Non-HttpOnly cookie (for frontend middleware routing)
- **csrf_token**: Non-HttpOnly cookie (for CSRF protection)

### Password Management

**Hashing**: bcrypt via passlib, 12 rounds, version `2b`
**Policy** (via `validate_password_strength()`):
- Minimum 8 characters, max 128
- Must contain: uppercase + lowercase + digit + special character
- Blocklist of common passwords (`password`, `admin123`, `qwerty12`, etc.)
**Reset flow**:
- `POST /auth/forgot-password` — sends email with reset link containing `password_reset` JWT (15 min TTL)
- Generic response "If email exists, reset link sent" — prevents user enumeration
- `POST /auth/reset-password` — validates reset token, validates new password, blacklists used token
- **Recovery codes** (`/activate/recovery/issue`, `/activate/recovery/reset`): HMAC-signed codes for offline-safe recovery, bound to specific user_id with TTL

### Multi-Factor Authentication (MFA)

| Endpoint | Function |
|----------|----------|
| `POST /auth/mfa/setup` | Generate TOTP secret + QR provisioning URI |
| `POST /auth/mfa/verify` | Verify TOTP code → enable MFA, return backup codes |
| `POST /auth/mfa/login` | Complete 2FA login with TOTP code (uses `mfa_token` from login) |
| `POST /auth/mfa/disable` | Disable MFA after password re-verification |
| `POST /auth/mfa/backup-codes` | Regenerate backup codes |

MFA flow:
1. Login → if `mfa_enabled`, returns `mfa_required: true` + `mfa_token` (short-lived intermediate token)
2. Client calls `/auth/mfa/login` with `mfa_token` + TOTP code
3. On success → full access/refresh tokens issued
4. Failed MFA attempt logged as `MFA_FAILED` security event

Implementation: pyotp (TOTP standard), backup codes stored as JSON array

**Assessment**: Mature MFA implementation. Follows standard TOTP patterns.

### Brute-Force Protection

Redis-backed, two-tier:
- **Per-IP**: `bf:ip:{ip}` counter, expires in 900s (15 min). Max 20 failures per IP.
- **Per-identifier**: `bf:id:{email_or_employee_id}` counter, expires in 900s. Max 5 failures per identifier.
- On lockout: 429 response with `Retry-After` header showing remaining TTL.
- Failed attempts recorded as `LOGIN_FAILED` security event.
- Successful login clears brute-force counters.

### Refresh Token Rotation + Reuse Detection

Implementing the "refresh token rotation with automatic reuse detection" pattern:

1. Each user has a token "family" stored as `rtf:{user_id}` in Redis, containing the current valid jti.
2. On refresh: old token jti is blacklisted, new token stored as family head.
3. If a previously-blacklisted jti is presented (reuse): entire family is invalidated, user forced to re-login, event logged as `REFRESH_REUSE_DETECTED`.

**Assessment**: State-of-the-art. Protects against refresh token theft.

### Session Management

- Implicit session via JWT tokens (no server-side session store)
- `session:{user_id}` key deleted on logout
- Logout blacklists both access and refresh tokens via jti
- Session considerations: No concurrent session limit, no device-specific session tracking

### Login Methods

- **Email + password**: Primary login method
- **Employee ID + password**: Alternative (corporate/employee login)
- **MFA step-up**: Required after successful password-based login if MFA enabled

### Self-Registration
- `POST /auth/register` — public endpoint
- Rate-limited (AUTH_RATE_LIMIT: 10/60s)
- Password strength validated
- Role restricted to PARENT/STUDENT only (prevents privilege escalation)
- Existing email check returns 409

---

## Strengths

1. **Refresh token rotation with reuse detection**: Industry best practice. Prevents stolen refresh tokens from being used.
2. **Brute-force protection**: Two-dimensional (IP + identifier). Proper lockout with TTL.
3. **Password policy**: Strong requirements + common password blocklist.
4. **Token type discrimination**: `type` field prevents cross-purpose token usage (refresh token can't be used as access, password_reset can't be used as refresh, etc.).
5. **MFA with backup codes**: Standard TOTP + recovery mechanism.
6. **Anti-enumeration in forgot-password**: Generic response regardless of email existence.
7. **Secure cookie attributes**: HttpOnly, SameSite=strict, Secure in production.
8. **Logout token blacklisting**: Prevents token reuse after intentional logout.
9. **Password recovery codes**: Admin-initiated HMAC-signed recovery codes as alternative to email reset.
10. **MFA disable requires password re-verification**: Prevents MFA bypass if session is hijacked.

---

## Weaknesses

1. **No concurrent session limit**: A user can login from multiple devices/browsers simultaneously. No session enumeration or management.
2. **No device/browser tracking beyond IP**: No fingerprint, no device ID. IP only logged in audit.
3. **No password history**: Previously used passwords not tracked. No prevention of password recycling.
4. **No account lockout after N password changes**: No suspicious activity detection for rapid changes.
5. **`user_role` in non-HttpOnly cookie**: Allows client-side JavaScript to read role. Minor UX integrity issue — not a security hole since backend authorizes.
6. **JWT HS256 (symmetric)**: Single shared secret. Cannot verify token origin. RS256 would add non-repudiation.
7. **No biometric/WebAuthn support**: No passkey/FIDO2 support. TOTP only.

---

## Issues

### Medium

| # | Issue | Detail |
|---|-------|--------|
| M1 | No concurrent session limit | User can be logged in from unlimited devices simultaneously |
| M2 | JWT HS256 symmetric | Single secret key. Token origin not verifiable |
| M3 | No password history | Password recycling not prevented |

### Low

| # | Issue | Detail |
|---|-------|--------|
| L1 | No device fingerprinting for login tracking | Only IP logged — weak device identification |
| L2 | No WebAuthn/passkey support | Modern alternative to TOTP |
| L3 | user_role cookie readable by JS | Minor UX integrity issue |
| L4 | No account lockout after suspicious password changes | Rapid reset detection missing |

---

## Recommended Improvements

1. **Add concurrent session tracking**: Store active sessions per user in Redis. Limit to N concurrent sessions. Show "active sessions" in UI. Medium effort.
2. **Add password history**: Store hashes of last 5 passwords. Prevent reuse. Low effort.
3. **Consider RS256 for JWT**: Asymmetric signing for non-repudiation. Medium effort — changes all token creation/validation.
4. **Add device fingerprinting**: Simple fingerprint: User-Agent + IP + timestamp hash. Log in audit. Low effort.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| Session tracking | Medium | Low |
| Password history | Low | Low |
| RS256 migration | Medium | Medium |
| Device fingerprint | Low | Low |

---

## Priority

| Priority | Item |
|----------|------|
| P1 (soon) | Password history |
| P2 (later) | Concurrent session tracking |
| P3 (nice-to-have) | RS256, WebAuthn, device fingerprint |

---

## Production Readiness: Authentication

**Ready.** The auth system is mature and implements industry best practices (refresh rotation, brute-force protection, MFA, token type discrimination). The remaining items are enhancements, not gaps.