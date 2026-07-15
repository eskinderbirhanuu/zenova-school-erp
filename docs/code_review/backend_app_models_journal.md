# File Reviewed

`backend/app/models/journal.py` (33 lines)

## Overview

Double-entry accounting: JournalEntry (header) and JournalLine (individual debit/credit lines). Supports entry reversal, approval workflow, and school-level isolation.

## Issues

### Issue 1 — No Check That Debits Equal Credits

- **Lines:** 23-33
- **Severity:** High
- **Category:** Data Integrity
- **Description:** There is no constraint (database or model-level) that `SUM(debits) = SUM(credits)` for a journal entry.
- **Why it is a problem:** In double-entry accounting, every journal entry must balance. Without this constraint, an unbalanced entry can be created, making reconciliation impossible.
- **Potential Impact:** The ledger will be permanently unbalanced. Financial reports will be incorrect.
- **Recommended Fix:** Add a database-level check constraint (via SQLAlchemy `CheckConstraint`) that `(SELECT SUM(debit) - SUM(credit) FROM journal_lines WHERE journal_entry_id = id) = 0`, or enforce in the service layer with a transaction.

### Issue 2 — No `accounting_period_id` on JournalEntry

- **Lines:** 7-20
- **Severity:** Medium
- **Category:** Functionality
- **Description:** JournalEntry has no FK to AccountingPeriod.
- **Why it is a problem:** Financial reports are organized by accounting periods (monthly, quarterly, yearly). Without period linkage, transactions can't be accurately placed in time.
- **Potential Impact:** Period-based financial reports (P&L, balance sheet) will be inaccurate.
- **Recommended Fix:** Add `accounting_period_id` FK to `periods` table.

### Issue 3 — `deleted_at` on JournalEntry and JournalLine

- **Lines:** 20, 33
- **Severity:** Medium
- **Category:** Audit
- **Description:** Both journal models have `deleted_at` for soft delete.
- **Why it is a problem:** Journal entries should be immutable for audit purposes. Soft-delete effectively allows erasing financial records, which is a regulatory violation.
- **Potential Impact:** An employee could "delete" an entry that shows a fraud or error, and the audit trail would be incomplete.
- **Recommended Fix:** Remove `deleted_at` from journal models. Use reversal entries (via `is_reversed` + `reversed_entry_id`) instead.

### Issue 4 — `entry_number` Not Unique

- **Line:** 11
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `entry_number` is not marked as unique. Two journal entries could have the same number.
- **Why it is a problem:** Journal entry numbers are used for accounting identification and reconciliation. Duplicates break trust in the system.
- **Potential Impact:** Accounting firm will reject duplicate entry numbers. Manual correction required.
- **Recommended Fix:** Add a unique constraint on `(school_id, entry_number)`.

### Issue 5 — No `description` on JournalLine (Optional)

- **Line:** 32
- **Severity:** Low
- **Category:** Functionality
- **Description:** JournalLine's description is nullable.
- **Why it is a problem:** In financial accounting, every journal line should describe what it's for (e.g., "Tuition fee for student X").
- **Potential Impact:** Auditors can't verify individual journal lines without descriptions.
- **Recommended Fix:** Make description non-nullable and require a meaningful entry.

## Security Review

- **Strong points:** Approval workflow (`approved_by` FK), reversal tracking, created_by attribution.
- **Weak points:** Soft delete on immutable accounting records, no debit=credit constraint.
- **Verdict:** The journal model has the right structure but lacks critical accounting constraints.

## Performance Review

- UUID primary keys.
- Indexes on FKs for common join operations.

## Maintainability

- Clean JournalEntry + JournalLine separation — standard accounting model.
- Well-named fields.

## Architecture Review

- Double-entry accounting is correctly implemented at the schema level.
- Missing debit=credit check and period linkage are critical gaps.
- Soft delete on accounting records is a regulatory risk.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 6/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 5/10 |
