# File Reviewed

`backend/app/services/parent_payment_service.py` (557 lines)

## Overview

Parent payment service — invoice listing, dashboard, payment session creation, Chapa webhook processing with full journal entries, receipts, and refund workflow. Implements concurrency safety with `with_for_update()`.

## Issues

### Issue 1 — `update_parent` Accepts Arbitrary Dict Keys

- **Lines:** 82-84
- **Severity:** Low
- **Category:** Security
- **Description:** Uses `for key, value in data.items()` with `hasattr` — any key matching a model attribute is set.
- **Why it is a problem:** Could set internal attributes.

### Issue 2 — `_next_sequence_number` Double Query on First Insert

- **Lines:** 40-59
- **Severity:** Low
- **Category:** Performance
- **Description:** After adding a new sequence and flushing, it queries again with `with_for_update()`. Could use `RETURNING` or check the flush result.
- **Why it is:** Redundant query on first use of a prefix each year.

### Issue 3 — `process_chapa_payment` Very Long Function

- **Lines:** 229-331
- **Severity:** Low
- **Category:** Maintainability
- **Description:** The function is 102 lines with multiple responsibilities: session validation, payment creation, invoice update, receipt creation, journal entry, platform fee recording.
- **Why it is a problem:** Hard to test and debug.

### Issue 4 — `_create_payment_journal_entry` Uses `ilike("%cash%")` and `ilike("%receivable%")`

- **Lines:** 385-396
- **Severity:** Medium
- **Category:** Reliability
- **Description:** Account lookup by name pattern matching. If the account names change or multiple matches exist, the journal entry creation fails silently.
- **Why it is a problem:** Fragile — depends on exact naming conventions.
- **Potential Impact:** Missing journal entries if accounts are renamed.

### Issue 5 — `process_refund` Reduces Invoice `paid_amount` Without Lock

- **Lines:** 531
- **Severity:** Medium
- **Category:** Concurrency
- **Description:** `invoice.paid_amount -= refund.amount` is not protected by `with_for_update()`. Two concurrent refund processes could see stale `paid_amount`.
- **Why it is a problem:** Double-refund for the same invoice.
- **Potential Impact:** Invoice paid_amount becomes negative.

### Issue 6 — `get_parent_dashboard` Has N+1 Query for Invoices per Student

- **Lines:** 107-141
- **Severity:** Low
- **Category:** Performance
- **Description:** For each student, a separate query fetches invoices. Acceptable for small families.

## Security Review

- **Strong points:** `with_for_update()` on payment session, Chapa webhook validation, parent-student link verification, HMAC validation reference in codebase.
- **Weak points:** Refund invoice update has no lock.
- **Good:** Idempotency check prevents duplicate webhook processing.

## Performance Review

- Acceptable for school payment volumes.
- N+1 pattern in dashboard is minor.

## Maintainability

- Well-structured with clear sections.
- `process_chapa_payment` should be refactored into smaller functions.

## Architecture Review

- Payment → Receipt → Journal Entry → Platform Fee chain is well-designed.
- Refund workflow (request → approve → process) is complete with reversal.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
