# File Reviewed

`backend/app/services/auth_service.py` (238 lines)

## Overview

Authentication service: user authentication, JWT token creation (access, refresh, MFA, password-reset), password management with history, login audit logging, parent-student authentication, and role resolution.

## Issues

### Issue 1 — `authenticate_user` Doesn't Return Specific Error Reason

- **Lines:** 13-23
- **Severity:** Medium
- **Category:** Security
- **Description:** Returns `None` for both "user not found" and "wrong password". While this prevents user enumeration in theory, it also prevents granular audit logging.
- **Why it is a problem:** No way to distinguish between brute force on existing users vs. random enumeration. Also, user-facing messages should differentiate (e.g., "user not found" for registration, "wrong password" after user found).
- **Potential Impact:** Security monitoring can't detect targeted attacks on specific accounts.
- **Recommended Fix:** Log specific failure reasons server-side (enabled/disabled user, wrong password, user not found) while keeping user-facing response generic.

### Issue 2 — `create_user` Enqueues Sync but May Fail Silently

- **Lines:** 54-56
- **Severity:** Low
- **Category:** Reliability
- **Description:** `enqueue_sync` is called but its return value is ignored. If sync queue creation fails, the user is created but never synced.
- **Potential Impact:** Cloud-school sync misses new user records.

### Issue 3 — JWT `decode_token` Tries HS256 After RS256 Without Checking Algorithm Type

- **Lines:** 93-105
- **Severity:** Medium
- **Category:** Security
- **Description:** When RS256 is configured, `decode_token` tries RS256 first, then falls back to HS256. If an attacker creates an HS256-signed token, it will be accepted even when RS256 is configured.
- **Why it is a problem:** An attacker who gets the HS256 secret can forge tokens that will be accepted even when the system is configured to use RS256.
- **Potential Impact:** Token forgery even after RS256 migration.
- **Recommended Fix:** When RS256 keys are configured, only accept RS256 tokens. Fall back to HS256 only as a transitional measure with a deprecation warning.

### Issue 4 — `log_login_audit` Commits Directly (Transaction Pollution)

- **Lines:** 123-140
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `log_login_audit` calls `db.commit()` directly. If the caller has an open transaction, this commits the caller's pending changes too.
- **Why it is a problem:** Implicit commits can cause partial data persistence. E.g., if called after `db.add(user)` but before `db.commit()`, the user creation is also committed.
- **Potential Impact:** Inconsistent state on subsequent error.
- **Recommended Fix:** Use `db.flush()` instead of `db.commit()`, or pass `db` as read-only for audit.

### Issue 5 — `authenticate_student_parent` Queries Without Tenant Isolation

- **Lines:** 207-230
- **Severity:** Medium
- **Category:** Security
- **Description:** The function queries by `student_id` (string) without filtering by `school_id`. If two schools have the same `student_id`, the wrong parent could be authenticated.
- **Why it is a problem:** Cross-tenant authentication — a parent from School A could authenticate against student X from School B if they share the same student_id.
- **Potential Impact:** Data breach — parent sees another school's student data.
- **Recommended Fix:** Always filter by `school_id` in parent authentication.

### Issue 6 — `reset_password` Has a Race Condition

- **Lines:** 191-204
- **Severity:** Low
- **Category:** Reliability
- **Description:** `_check_password_history` checks history, then `_record_password_history` adds the new hash. Between the check and the record, another concurrent reset could bypass the history check.
- **Potential Impact:** Password reuse not prevented under concurrent reset requests.

## Security Review

- **Strong points:** Password history tracking, MFA step-up tokens, separate token types (access/refresh/MFA/password_reset), RS256+HS256 support, login audit logging, password strength validation.
- **Weak points:** RS256→HS256 fallback weakens RS256 security, cross-tenant parent auth, implicit commits in audit logging.
- **Verdict:** Strong authentication service with a few enterprise-grade concerns.

## Performance Review

- Synchronous password hashing (bcrypt rounds=12) — ~200-300ms per hash. Acceptable.

## Maintainability

- Well-structured with clear functions.
- Token creation functions have distinct purposes and types — good.

## Architecture Review

- Service layer correctly separates business logic from API endpoints.
- RS256/HS256 dual support is good for migration but the fallback logic weakens RS256.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 7/10 |
