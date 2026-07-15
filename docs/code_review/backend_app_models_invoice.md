# File Reviewed

`backend/app/models/invoice.py` (35 lines)

## Overview

Invoice and InvoiceLine models. Tracks student billing with amounts, due dates, status, paid amounts, and currency. Supports multi-currency.

## Issues

### Issue 1 — Invoice `status` Is Free-Text String

- **Line:** 18
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `status` is `String(20)` with default `"draft"`. No enum constraint. Statuses like "draft", "issued", "paid", "overdue", "cancelled", "refunded" should be standardized.
- **Why it is a problem:** Inconsistent status values ("paid" vs "Paid" vs "completed") will break financial reporting.
- **Potential Impact:** Incorrect revenue reporting, aging calculations, and payment reconciliation.
- **Recommended Fix:** Use an `InvoiceStatus` enum.

### Issue 2 — `paid_amount` Is a Field on Invoice Instead of Calculated

- **Line:** 17
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `paid_amount` is stored as a field on the invoice. It should be calculated from linked payments.
- **Why it is a problem:** Stored calculated fields can become stale if a payment is created/refunded without updating the invoice. Race conditions possible.
- **Potential Impact:** Invoice shows incorrect paid amount. Finance team over- or under-collects.
- **Recommended Fix:** Remove `paid_amount` and calculate it dynamically from `Payment.invoice_id` SUM. Use a database view or cache if performance is needed.

### Issue 3 — No `branch_id` on Invoice

- **Lines:** 7-24
- **Severity:** Low
- **Category:** Architecture
- **Description:** Invoice has `school_id` but no `branch_id`.
- **Why it is a problem:** Branch-level financial reporting requires filtering invoices by branch. Without branching, all reports are school-wide.
- **Potential Impact:** Branch managers can't see their own financial data.
- **Recommended Fix:** Add `branch_id` FK to Invoice and InvoiceLine.

### Issue 4 — InvoiceLine Has No `description` for the Fee That Was Billed

- **Lines:** 33
- **Severity:** Low
- **Category:** Functionality
- **Description:** InvoiceLine's `description` field stores the fee description as a string, but there's no FK to the original `FeeAssignment`.
- **Why it is a problem:** If a fee structure changes, historical invoices can't be traced back to the original fee definition.
- **Potential Impact:** Auditors can't verify that the invoice matches the fee structure that was active at the time.
- **Recommended Fix:** Keep description (for historical record) but also add `fee_assignment_id` FK (already exists) and ensure it's always populated.

### Issue 5 — No `discount_amount` or `scholarship_amount` on Invoice

- **Lines:** 7-24
- **Severity:** Medium
- **Category:** Functionality
- **Description:** Invoice has no fields for discounts or scholarships applied.
- **Why it is a problem:** The reviewer's Round 3 checklist asks for discount, scholarship, platform fee, and ledger tracking. Without discount/scholarship fields, the invoice can't accurately reflect what the parent owes.
- **Potential Impact:** Finance reports can't separate tuition from discounts from scholarships.
- **Recommended Fix:** Add `discount_amount`, `scholarship_amount`, `platform_fee_amount` fields.

## Security Review

- FK constraints to student, academic year, school, user — good referential integrity.
- Soft-delete via `deleted_at` — appropriate.

## Performance Review

- UUID primary keys.
- No performance optimizations needed at the model level.

## Maintainability

- Clean structure with Invoice + InvoiceLine separation — correct normalization.
- Missing enum for status is a maintenance concern.

## Architecture Review

- `paid_amount` as a storage field instead of computed is a design flaw.
- Missing `branch_id` limits branch-level reporting.
- Missing discount/scholarship fields limits financial accuracy.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 8/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
