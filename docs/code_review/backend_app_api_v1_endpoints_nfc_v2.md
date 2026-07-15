# File Reviewed

`backend/app/api/v1/endpoints/nfc_v2.py` (279 lines)

## Overview

NFC v2 management — assign cards by type (student/staff/parent/employee), bulk assign, public lookup (rate-limited, no auth), scan, card-to-person resolution by type, status updates, print request workflow (create/list/process), PDF card download, QR code generation, and scan logs.

## Issues

### Issue 1 — Four Nearly Identical Assign Endpoints

- **Lines:** 21-74
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `/nfc/student/assign`, `/nfc/staff/assign`, `/nfc/parent/assign`, `/nfc/employee/assign` are structurally identical, differing only in permission and service call. Could be consolidated.

### Issue 2 — Four Nearly Identical Card-by-UID Lookup Endpoints

- **Lines:** 114-186
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Same pattern as assign endpoints — `/nfc/student/by-card/{card_uid}`, `/nfc/staff/by-card/{card_uid}`, `/nfc/parent/by-card/{card_uid}`, `/nfc/employee/by-card/{card_uid}`.

### Issue 3 — Public Lookup Endpoint Returns School Contact Info

- **Lines:** 90-99
- **Severity:** Note
- **Category:** Design
- **Description:** Returns whether card belongs to ZENOVA with contact info. Rate-limited at 60/min. No PII returned — good.

### Issue 4 — `download_card_pdf` and `get_card_qr_code` Use Lazy Imports

- **Lines:** 243, 260-261
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `generate_card_pdf`, `generate_card_qr_png`, `resolve_card_type` imported inside function bodies.

## Security Review

- Permission checks on assign (STUDENT_CREATE, STAFF_CREATE, PARENT_CREATE, CARD_PRINT_ASSIGN).
- `require_licensed_feature("nfc")` on NFC endpoints.
- Public lookup is rate-limited and returns no PII.

## Performance Review

- PDF and QR generation are on-demand (could be cached for frequently accessed cards).

## Maintainability

- High duplication across card type variants (assign + lookup).

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 8/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 7/10 |
