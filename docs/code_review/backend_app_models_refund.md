# File Reviewed

`backend/app/models/refund.py` (40 lines)

## Overview

Refund model — tracks payment refunds with approval workflow. Links to original payment, receipt, invoice, student, parent. Supports full refund lifecycle (pending → approved/rejected → processed).

## Issues

### Issue 1 — `deleted_at` on Refund — Should Be Immutable

- **Line:** 40
- **Severity:** Medium
- **Category:** Audit
- **Description:** Refund has a `deleted_at` soft-delete field.
- **Why it is a problem:** Financial refund records should never be deleted — even softly. A soft-deleted refund is invisible to financial reports, creating a gap.
- **Potential Impact:** Financial reports would show less refund activity than actually occurred.
- **Recommended Fix:** Remove `deleted_at` from Refund.

### Issue 2 — No `original_payment_journal_id` Link

- **Lines:** 7-40
- **Severity:** Medium
- **Category:** Accounting
- **Description:** Refund links to `payment_id` but not to the journal entry that recorded the original payment.
- **Why it is a problem:** In double-entry accounting, a refund is a reversal entry that must reference the original journal entry.
- **Potential Impact:** Accounting reconciliation will be difficult — can't trace refund to the original debit/credit.
- **Recommended Fix:** Add `journal_entry_id` FK to link to the reversal journal entry, and ensure the service layer creates a reversal entry.

### Issue 3 — No `partial_refund` Indicator

- **Lines:** 7-40
- **Severity:** Low
- **Category:** Functionality
- **Description:** No field to indicate whether this is a full or partial refund.
- **Why it is a problem:** The original payment's `paid_amount` and `refunded_amount` can't be tracked without knowing if the refund is partial.
- **Potential Impact:** Can't determine if a payment is partially refunded.
- **Recommended Fix:** Add `is_partial` boolean field.

### Issue 4 — `refund_method` Free-Text String

- **Line:** 25
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `refund_method` is `String(50)` with documented valid values (original, cash, bank) but no enum.
- **Why it is a problem:** Inconsistent method values.
- **Potential Impact:** Reporting on refund methods becomes unreliable.

## Security Review

- **Strong points:** Approval workflow (requested_by, approved_by, processed_by), status tracking, rejection reason.
- **Weak points:** No approval workflow enforcement at the database level (any status change allowed).
- **Verdict:** Good refund model with proper approval separation.

## Performance Review

- Index on `refund_number` for fast lookup.
- UUID primary key.

## Maintainability

- Well-structured with clear approval workflow fields.
- Good field naming.

## Architecture Review

- Refund model correctly separates from Payment and has proper approval workflow.
- `deleted_at` on financial records is an architectural concern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
