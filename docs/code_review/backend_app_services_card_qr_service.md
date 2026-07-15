# File Reviewed

`backend/app/services/card_qr_service.py` (35 lines)

## Overview

Card QR code generation and card type resolution service — generates QR code PNG images from card UIDs and resolves which card type table a UID belongs to by sequential search.

## Issues

### Issue 1 — Sequential Table Probe for Card Type Resolution

- **Lines:** 24-35
- **Severity:** Medium
- **Category:** Performance
- **Description:** `resolve_card_type` queries tables sequentially (StudentCard → StaffCard → ParentCard → EmployeeCard) until it finds a match. For a card not in any table, it queries all four.
- **Why it is a problem:** Four database queries to determine a card doesn't exist.
- **Potential Impact:** Each NFC scan triggers up to 4 DB queries.
- **Recommended Fix:** Use a single query with UNION or a lookup table mapping UID hash to card type.

### Issue 2 — No Error Handling in `generate_card_qr_png`

- **Lines:** 12-21
- **Severity:** Low
- **Category:** Robustness
- **Description:** No try/except for QR generation. A malformed or extremely long UID could cause issues.

## Security Review

- Card UID is hashed before database lookup — good.
- QR code contains raw card UID — if UIDs are predictable, QR codes could be forged.

## Performance Review

- QR generation is fast.
- Sequential table probe is the main concern.

## Maintainability

- Clean and simple.
- Adding a new card type requires adding another `if` block.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 6/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
