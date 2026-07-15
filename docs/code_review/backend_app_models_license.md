# File Reviewed

`backend/app/models/license.py` (53 lines)

## Overview

License model — core licensing and anti-piracy system. Supports license types (super_admin, main, branch, trial, monthly, yearly, lifetime), statuses (active, expired, suspended, revoked, review_mode, device_locked), hardware binding via machine fingerprint and TPM, offline grace period tracking, and device change management.

## Issues

### Issue 1 — `max_users` Is a `String(50)` Instead of Integer

- **Line:** 39
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `max_users` is `String(50)` but should logically be an integer. Storing a number as a string is a type violation.
- **Why it is a problem:** Sorting and comparing user limits requires type conversion. "100" > "20" is False in string comparison.
- **Potential Impact:** License enforcement for user limits would be incorrect if compared as strings.
- **Recommended Fix:** Change to `Integer` column.

### Issue 2 — `LicenseStatus` Has No `PENDING` or `TRIAL_EXPIRED` Status

- **Lines:** 19-24
- **Severity:** Low
- **Category:** Functionality
- **Description:** Missing status for trial expiration and pending activation.
- **Why it is a problem:** A trial that hasn't been activated and an expired trial both map to "expired", losing the distinction.
- **Potential Impact:** Marketing/sales can't distinguish between "never activated" and "trial expired".
- **Recommended Fix:** Add `PENDING` and `TRIAL_EXPIRED` statuses.

### Issue 3 — `school_id` Is Nullable for License

- **Line:** 35
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `school_id` is nullable on license. A license can exist without being bound to a school.
- **Why it is a problem:** Orphan licenses with no school association can accumulate.
- **Potential Impact:** Unused license keys that should be bound to schools.
- **Recommended Fix:** Make `school_id` non-nullable or enforce binding at the service layer.

### Issue 4 — No `ref_id`/`customer_ref` for License Server Tracking

- **Lines:** 28-53
- **Severity:** Low
- **Category:** Functionality
- **Description:** License has no field for the license server's reference ID or customer ID.
- **Why it is a problem:** When communicating with the license server, there's no way to correlate the local license with the server record.
- **Potential Impact:** License management and reconciliation require manual matching.
- **Recommended Fix:** Add a `license_server_ref` field.

## Security Review

- **Strong points:** Enum-based license types and statuses prevent invalid values. Machine fingerprint (SHA-256) and TPM sealing for hardware binding. Offline grace period tracking. Device change reason logging.
- **Weak points:** `max_users` as string is a data integrity issue, not a security issue per se.
- **Verdict:** The license model is well-designed for anti-piracy with hardware binding, TPM support, and device change tracking.

## Performance Review

- Index on `key` and `machine_fingerprint` for fast lookup.
- UUID primary key — appropriate.

## Maintainability

- Uses Python enums for type safety.
- Well-commented fields with clear purposes.

## Architecture Review

- License model correctly separates from school model.
- The hardware-binding architecture (fingerprint + TPM + device change tracking) is well thought out.
- `max_users` as string is an engineering oversight.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 9/10 |
| Security | 9/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 9/10 |
