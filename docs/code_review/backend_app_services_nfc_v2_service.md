# File Reviewed

`backend/app/services/nfc_v2_service.py` (484 lines)

## Overview

NFC v2 card service — per-entity card models (StudentCard, StaffCard, ParentCard, EmployeeCard) with UID hashing, scan handling, print request workflow, bulk assignment, public card lookup (anti-enumeration), and scan log management.

## Issues

### Issue 1 — `_ensure_unique_card_uid` Queries All Four Tables on Every Assignment

- **Lines:** 19-22
- **Severity:** Medium
- **Category:** Performance
- **Description:** Each card assignment queries all four card tables to check uniqueness. Combined with the type-specific duplicate check in the assign function, this means 5 queries per card assignment.
- **Why it is a problem:** Each NFC card assignment generates 5 database queries.
- **Potential Impact:** Slow bulk import of NFC cards.

### Issue 2 — `scan_nfc` Queries Card Tables Sequentially

- **Lines:** 138-143
- **Severity:** Medium
- **Category:** Performance
- **Description:** Each NFC scan queries all four card tables sequentially until a match is found. For an unknown card, all four are queried.
- **Why it is a problem:** Each NFC scan triggers up to 4 DB queries.
- **Potential Impact:** High DB load during peak scan times.

### Issue 3 — `scan_nfc` Has N+1 Person Name Resolution

- **Lines:** 167-189
- **Severity:** Low
- **Category:** Performance
- **Description:** After finding the card, additional queries fetch person details. For staff, this is two queries (StaffProfile + User).

### Issue 4 — `_school_lookup` Duplicates Sequential Card Table Probing

- **Lines:** 410-442
- **Severity:** Low
- **Category:** Code Duplication
- **Description:** The same sequential probing pattern used in `scan_nfc` and `resolve_card_type` is duplicated in `_school_lookup` and `public_lookup_card`.

### Issue 5 — `public_lookup_card` Reveals Card Existence Despite Documentation Claiming Otherwise

- **Lines:** 445-459
- **Severity:** Medium
- **Category:** Security
- **Description:** The docstring claims the response does NOT reveal whether the card UID exists. However, the response differs: known cards return a school-specific message, unknown cards return a generic message. An attacker can infer which UIDs are registered.
- **Why it is a problem:** Anti-enumeration is defeated by different response messages.
- **Potential Impact:** Attackers can enumerate valid card UIDs.
- **Recommended Fix:** Return the same generic message for both cases.

### Issue 6 — `update_card_status` Fetches School ID via Additional Queries

- **Lines:** 300-310
- **Severity:** Low
- **Category:** Performance
- **Description:** After updating card status, additional queries fetch the school_id for audit logging. The card model already has a `school_id` field.

### Issue 7 — Missing Card in `update_card_status` Returns False Without Logging

- **Lines:** 296-298
- **Severity:** Low
- **Category:** Error Handling
- **Description:** Returns `False` with no audit trail if card not found.

## Security Review

- UID hashing on all operations — good.
- Public lookup designed with anti-enumeration intent (but fails at it).
- Audit logging on all mutations.
- Card status checked during scan (`status != "active"`).

## Performance Review

- 4-5 queries per NFC scan — acceptable for low volume but concerning for high-load scenarios.
- Should consider caching card → person mappings in Redis.

## Maintainability

- Well-organized with per-entity assign functions.
- Duplicated query patterns across multiple functions.

## Architecture Review

- Per-entity card models (v2) replace the deprecated monolithic NFCCard model — good.
- Print request workflow (request → approve → print) is well-designed.
- Bulk assignment supports CSV import.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 5/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
