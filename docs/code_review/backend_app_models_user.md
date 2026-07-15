# File Reviewed

`backend/app/models/user.py` (50 lines)

## Overview

User and PasswordHistory SQLAlchemy models. Supports authentication, role-based access control, MFA, soft-delete, and password history tracking.

## Issues

### Issue 1 — `PasswordHistory` Has No Foreign Key Constraint Check on `hashed_password` Format

- **Line:** 16
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `hashed_password` is stored as `String(255)`. Bcrypt hashes are typically 60 characters.
- **Why it is a problem:** The 255-char limit is fine for bcrypt, but there's no validation that the stored value is a valid bcrypt hash.
- **Potential Impact:** If a bug causes plaintext passwords to be stored in history, it won't be detected at the model level.
- **Recommended Fix:** Use a `@validates` decorator to ensure the hashed value starts with `$2b$`.

### Issue 2 — `mfa_secret` and `mfa_backup_codes` Stored in Plain Text

- **Lines:** 36-37
- **Severity:** Medium
- **Category:** Security
- **Description:** MFA secrets and backup codes are stored in plain text in the database.
- **Why it is a problem:** If the database is compromised, an attacker can read all MFA secrets and generate valid TOTP codes.
- **Potential Impact:** Complete MFA bypass after database breach.
- **Recommended Fix:** Encrypt `mfa_secret` using AES-256 with an application-level key (separate from the database encryption).

### Issue 3 — `is_superuser` Is a Simple Boolean Without Audit

- **Line:** 33
- **Severity:** Low
- **Category:** Security
- **Description:** `is_superuser` is a plain boolean field with no audit trail for changes.
- **Why it is a problem:** If a user is granted superuser privileges, the change isn't logged, making it impossible to investigate privilege escalation.
- **Potential Impact:** No forensic trail for privilege misuse.
- **Recommended Fix:** Log superuser status changes in the audit log service layer.

### Issue 4 — `delete_at` Is Nullable for Soft Delete but No `is_deleted` Helper

- **Line:** 45
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Soft deletion uses `deleted_at` timestamp. There's no model-level property to check `is_deleted`.
- **Why it is a problem:** Developers must write `user.deleted_at is not None` everywhere, which is error-prone.
- **Potential Impact:** Inconsistent soft-delete checks across the codebase.
- **Recommended Fix:** Add a `@property def is_deleted(self) -> bool:` helper.

## Security Review

- **Strong points:** UUID primary keys (unguessable), password history for reuse prevention, soft-delete support, MFA fields ready.
- **Weak points:** MFA secrets stored in plaintext, no `is_superuser` change audit.
- **Verdict:** Well-structured user model with appropriate security features. MFA secret encryption is the main gap.

## Performance Review

- Indexes on `email` and `employee_id` for fast login lookups.
- UUID primary keys have index performance trade-offs (larger than auto-increment integers).

## Maintainability

- Clean column definitions with comments.
- Relationships use lazy loading by default (SQLAlchemy default) — appropriate.

## Architecture Review

- Follows SQLAlchemy declarative base pattern correctly.
- UUID primary keys are appropriate for distributed/multi-tenant architecture.
- `PasswordHistory` as a separate table is a good pattern for password reuse prevention.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 9/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
