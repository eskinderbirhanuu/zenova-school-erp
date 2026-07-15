# File Reviewed

`backend/app/models/payment.py` (25 lines)

## Overview

Payment model — records financial transactions. Links to invoice, student, parent, school, receiving user, and journal entry. Supports multi-currency and idempotency keys.

## Issues

### Issue 1 — No `status` Field

- **Lines:** 7-25
- **Severity:** High
- **Category:** Functionality
- **Description:** Payment has no `status` field (pending, completed, failed, refunded, cancelled, reversed).
- **Why it is a problem:** A payment record exists from creation, but there's no way to know if it succeeded or failed. Failed payment attempts will still appear as payments.
- **Potential Impact:** Financial reports will be inaccurate. E.g., a failed Chapa payment could be counted as revenue.
- **Recommended Fix:** Add a `status` column with an enum (PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED).

### Issue 2 — No `refunded_amount` or Original Payment Link for Refunds

- **Lines:** 7-25
- **Severity:** Medium
- **Category:** Functionality
- **Description:** There's no field for refunded amount or a link to a refund record.
- **Why it is a problem:** When a payment is refunded, the original payment record has no way to reflect the refund.
- **Potential Impact:** Payment reports will show the full amount even after refunds.
- **Recommended Fix:** Add `refunded_amount` (DECIMAL) and `refunded_at` (DateTime) fields, or a `refund_of` FK to self.

### Issue 3 — No `notes` or `description` Field

- **Lines:** 7-25
- **Severity:** Low
- **Category:** Functionality
- **Description:** Payment has no notes or description field.
- **Why it is a problem:** Operators can't add context about a payment (e.g., "parent paid in cash at office").
- **Potential Impact:** Poor auditability for manual payments.
- **Recommended Fix:** Add a `notes` text field.

### Issue 4 — `payment_number` Not Defined as Unique

- **Line:** 11
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `payment_number` is `nullable=False` but not unique.
- **Why it is a problem:** Two payments could have the same payment number, making reconciliation impossible.
- **Potential Impact:** Duplicate payment numbers cause confusion in financial accounting.
- **Recommended Fix:** Add `unique=True` to `payment_number`.

## Security Review

- `idempotency_key` with unique constraint prevents duplicate payment processing — good.
- `received_by` FK links payment to the user who recorded it — good accountability.
- `journal_entry_id` links to accounting journal — good for audit trail.
- `deleted_at` supports soft-delete (though payments should never be deleted).

## Performance Review

- UUID primary key — appropriate.
- Indexes would benefit `payment_number`, `invoice_id`, `student_id` for common lookups.

## Maintainability

- Short, clean model.
- Missing status field is a significant gap.

## Architecture Review

- The Payment model is missing a `status` field, which is a fundamental oversight for any financial system.
- Links to invoice, student, parent, school, user, and journal — good integration with the broader financial model.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
