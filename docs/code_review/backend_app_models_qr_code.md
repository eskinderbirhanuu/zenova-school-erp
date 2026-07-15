# File Reviewed

`backend/app/models/qr_code.py` (24 lines)

## Overview

QR code model — stores encrypted tokens for QR-based student/staff identification. Uses polymorphic reference (reference_type + reference_id) with composite index.

## Issues

### Issue 1 — `uuid` Column Name Shadows Python Built-in

- **Line:** 11
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Column named `uuid` shadows the Python `uuid` module imported at line 1.
- **Why it is a problem:** If a developer later writes `import uuid; uuid.uuid4()`, they'll get the column value instead of the module.
- **Potential Impact:** Name collision errors in service code that processes QR codes.
- **Recommended Fix:** Rename the column to `qr_uuid` or `unique_identifier`.

### Issue 2 — Polymorphic Pattern Lacks FK Constraints

- **Lines:** 13-14
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `reference_type` + `reference_id` pattern has no FK constraint. `reference_id` can reference non-existent entities.
- **Why it is a problem:** Orphan QR codes that reference deleted students or staff.
- **Potential Impact:** QR scan succeeds but the referenced entity is gone.
- **Recommended Fix:** Use per-entity FK columns or add application-level validation.

### Issue 3 — `encrypted_token` Length May Be Insufficient

- **Line:** 12
- **Severity:** Low
- **Category:** Functionality
- **Description:** `encrypted_token` is `String(500)`. Depending on encryption algorithm, encrypted tokens could exceed 500 characters.
- **Why it is a problem:** Truncated tokens would be undecryptable.
- **Potential Impact:** QR codes become unreadable.
- **Recommended Fix:** Increase to `Text` type.

## Security Review

- **Strong points:** Token is encrypted (not plain text), `is_active` flag for revocation, `expires_at` for TTL, UUID-based lookup prevents sequential scanning.
- **Weak points:** Polymorphic reference can't be enforced at DB level.
- **Verdict:** Good security model for QR-based identification.

## Performance Review

- Composite index on `(reference_type, reference_id)` for efficient lookups.
- Index on `uuid` for unique code lookup.

## Maintainability

- Clean, well-structured model.
- `__table_args__` for composite index — good practice.

## Architecture Review

- QR model correctly uses encrypted tokens rather than raw student IDs.
- The `reference_type` + `reference_id` polymorphic pattern is the same approach as the deprecated NFCCard — should consider migrating to per-entity models.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
