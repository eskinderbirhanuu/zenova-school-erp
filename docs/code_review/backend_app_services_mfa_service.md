# File Reviewed

`backend/app/services/mfa_service.py` (103 lines)

## Overview

Multi-factor authentication service — TOTP-based MFA using `pyotp`, with backup codes, setup initiation/completion, disable, and role-based MFA enforcement for SUPER_ADMIN and FINANCE roles.

## Issues

### Issue 1 — `verify_mfa_code` Accepts Both TOTP and Backup Code in One Call

- **Lines:** 89-94
- **Severity:** Low
- **Category:** Design
- **Description:** The function tries TOTP first, then backup code. A six-digit TOTP code could theoretically match a backup code (8 hex chars), though unlikely.
- **Why it is a note:** Acceptable design for convenience.

### Issue 2 — Backup Code Removal After Use Can Leave Empty List

- **Lines:** 35-38
- **Severity:** Low
- **Category:** Usability
- **Description:** After all backup codes are used, `user.mfa_backup_codes` becomes an empty list. The user is not notified to regenerate.
- **Potential Impact:** User locked out if they lose TOTP device and have no backup codes.

### Issue 3 — MFA Secret Stored in Plain Text in Database

- **Lines:** 47-48
- **Severity:** Medium
- **Category:** Security
- **Description:** The TOTP secret is stored as-is in the `mfa_secret` column. If the database is compromised, all MFA secrets are exposed.
- **Why it is a problem:** An attacker with DB access can generate TOTP codes for any user.
- **Potential Impact:** MFA bypass via DB compromise.
- **Recommended Fix:** Encrypt the MFA secret at rest.

### Issue 4 — `MFA_REQUIRED_ROLES` Hardcoded

- **Lines:** 97
- **Severity:** Low
- **Category:** Flexibility
- **Description:** MFA enforcement for SUPER_ADMIN and FINANCE is hardcoded.
- **Potential Impact:** Adding a new MFA-required role requires code changes.

## Security Review

- TOTP with valid_window=1 (30s + 30s before/after) — good usability/security balance.
- Backup codes use `secrets.token_hex(4)` = 8 hex chars (32 bits) — 16 million possibilities, good.
- MFA secret in plaintext in DB is the main concern.

## Performance Review

- TOTP verification is fast — no concerns.

## Maintainability

- Clean, well-structured service.
- Good separation between setup, enable, verify, disable.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 7/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 7/10 |
