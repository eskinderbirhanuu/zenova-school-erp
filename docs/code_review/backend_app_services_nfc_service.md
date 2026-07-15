# File Reviewed

`backend/app/services/nfc_service.py` (97 lines)

## Overview

NFC card service — assign, validate, update status, and query history. Uses deprecated NFCCard model (polymorphic). Delegates UID hashing to `uid_hash` utility.

## Issues

### Issue 1 — Uses Deprecated NFCCard Model

- **Line:** 3
- **Severity:** Medium
- **Category:** Architecture
- **Description:** Imports `NFCCard` from `app.models.nfc_card`, which is explicitly marked as deprecated. The new per-entity card models (StudentCard, StaffCard, etc.) are not used.
- **Why it is a problem:** New NFC assignments go to the deprecated table. The migration to per-entity models is incomplete.
- **Potential Impact:** NFC cards are stored in a table that's scheduled for removal.

### Issue 2 — `assign_nfc` Doesn't Check for Duplicate Reference Assignment

- **Lines:** 8-42
- **Severity:** Medium
- **Category:** Functionality
- **Description:** The function checks for duplicate UID but not for duplicate `(reference_type, reference_id)` assignment. A person could be assigned multiple NFC cards.
- **Why it is a problem:** When validating an NFC scan, the system can't determine which of multiple cards is the current one.
- **Potential Impact:** Users can have multiple active cards, leading to confusion on scan.

### Issue 3 — No License/NFC Feature Check

- **Lines:** 8-42
- **Severity:** Low
- **Category:** Functionality
- **Description:** No check if the school's license permits NFC features.
- **Why it is a problem:** An unlicensed school could use NFC features.
- **Potential Impact:** Revenue leakage for NFC feature licensing.

## Security Review

- UID is hashed via `hash_card_uid` — good, not stored in plain text.
- Audit logging on all operations.

## Performance Review

- Simple CRUD operations — no performance concerns.

## Maintainability

- Clean, simple CRUD service.
- Should be migrated to use per-entity card models.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 8/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
