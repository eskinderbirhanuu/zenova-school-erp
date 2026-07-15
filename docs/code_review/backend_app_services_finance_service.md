# File Reviewed

`backend/app/services/finance_service.py` (766 lines)

## Overview

Comprehensive finance service: chart of accounts, journal entries (double-entry, debit=credit enforced), payment recording with auto journal entry generation, invoice aging, wallet transactions with concurrency safety, scholarships, accounting periods with lock/unlock, payroll, budgets, purchase requests/orders, and trial balance.

## Issues

### Issue 1 — `trial_balance` Loads ALL Journal Lines in Memory

- **Lines:** 748-766
- **Severity:** High
- **Category:** Performance
- **Description:** `trial_balance()` queries all accounts for a school, then for each account queries all journal lines. This executes N+1 queries (1 for accounts + 1 per account).
- **Why it is a problem:** For a school with 100+ accounts and 100K+ journal lines, the trial balance will return slowly or timeout.
- **Potential Impact:** Trial balance report becomes unusable as data grows. Financial reporting failures.
- **Recommended Fix:** Use a single aggregation query: `SELECT account_id, SUM(debit), SUM(credit) FROM journal_lines GROUP BY account_id`.

### Issue 2 — `_create_payment_journal_entry` Uses Auto-Created Accounts

- **Lines:** 419-449
- **Severity:** Medium
- **Category:** Accounting
- **Description:** If "Cash on Hand" or "Student Fees Receivable" accounts don't exist, they are auto-created with hardcoded account numbers (1001, 1201).
- **Why it is a problem:** Auto-creating accounts during a payment creates inconsistency — an account could appear in journal entries that wasn't properly set up in the chart of accounts.
- **Potential Impact:** Trial balance and financial reports may include accounts that were never properly configured.
- **Recommended Fix:** Require the chart of accounts to be set up before accepting payments. Validate at startup.

### Issue 3 — `_create_payment_journal_entry` Always Credits Receivable Account

- **Lines:** 447-448
- **Severity:** Medium
- **Category:** Accounting
- **Description:** The journal entry always credits "Student Fees Receivable" (reducing the receivable). But if the payment is for a different purpose (registration fee, late fee), this accounting is incorrect.
- **Why it is a problem:** Receivables tracking becomes inaccurate when payments are applied to non-tuition fees.
- **Potential Impact:** Balance sheet shows incorrect receivables balance. Financial audit would fail.
- **Recommended Fix:** Map each fee type to its revenue account and credit the appropriate account.

### Issue 4 — Purchase Request/Order Number Uses `count()` — Race Condition

- **Lines:** 694, 727
- **Severity:** Medium
- **Category:** Reliability
- **Description:** Purchase request and order numbers use `count() + 1` to generate sequential numbers. Under concurrent requests, two requests could get the same number.
- **Why it is a problem:** Duplicate PR/PO numbers cause reconciliation issues with suppliers.
- **Potential Impact:** Accounting and procurement confusion.
- **Recommended Fix:** Use the `_next_sequence_number()` pattern (which uses `with_for_update()`) instead of `count()`.

### Issue 5 — `_check_period` Runs on Every Transaction but Queries Without Caching

- **Lines:** 95-103
- **Severity:** Low
- **Category:** Performance
- **Description:** `_check_period` queries the `AccountingPeriod` table on every journal entry creation. For bulk operations, this is repeated unnecessarily.
- **Potential Impact:** Minor performance overhead on each transaction.

### Issue 6 — `get_invoice_aging` Loads All Invoices in Memory

- **Lines:** 342-369
- **Severity:** Medium
- **Category:** Performance
- **Description:** Loads ALL pending/partial invoices for a school into memory and iterates over them in Python.
- **Why it is a problem:** For schools with 10K+ unpaid invoices, this loads all data into memory.
- **Potential Impact:** Memory spikes on aging report generation.
- **Recommended Fix:** Use SQL aggregation (CASE WHEN + SUM) to bucket invoices at the database level.

### Issue 7 — `create_invoice` Sends Notification Synchronously Inside the Transaction

- **Lines:** 306-327
- **Severity:** Low
- **Category:** Performance
- **Description:** After creating an invoice, the function calls `send_notification` for each parent before returning. This sends email/SMS inside the database transaction.
- **Potential Impact:** Invoice creation is delayed until all notifications are sent. If email fails, the invoice might still be committed.
- **Recommended Fix:** Use background tasks for notifications.

### Issue 8 — `wallet_transaction` Checks Period After Transaction Is Created

- **Line:** 501
- **Severity:** Medium
- **Category:** Logic
- **Description:** `_check_period()` is called AFTER the wallet transaction is flushed to the DB. If the period is locked, the error is raised but the transaction is already partially processed.
- **Potential Impact:** Wallet balance could be updated even though the journal entry fails (since the wallet is flushed before the period check).
- **Recommended Fix:** Check the period BEFORE processing the wallet transaction.

### Issue 9 — No `bank_reconciliation` Module

- **Lines:** 1-766
- **Severity:** Low
- **Category:** Functionality
- **Description:** The finance service has no bank reconciliation functionality. Transaction matching between Chapa/bank statements and internal records is manual.
- **Potential Impact:** Financial discrepancies go undetected.
- **Recommended Fix:** Implement a bank reconciliation module that matches payments against bank statements.

## Security Review

- **Strong points:** `with_for_update()` on wallet transactions prevents race conditions. Accounting period locking prevents post-close entries. Idempotency keys prevent duplicate payments. Audit logging on all financial operations.
- **Weak points:** Auto-created accounts bypass chart of accounts setup.
- **Verdict:** Solid financial controls with proper concurrency protection and audit trails.

## Performance Review

- **N+1 query problem** in `trial_balance` is the most significant performance issue.
- `get_invoice_aging` loading all rows in memory is a secondary concern.
- `count()` based numbering has both concurrency and performance issues.

## Maintainability

- Well-organized with clear function names and CRUD patterns.
- Consistent audit logging pattern throughout.
- Long file (766 lines) but logically grouped.

## Architecture Review

- Double-entry accounting correctly enforced with debit=credit validation.
- Wallet transactions use row-level locking for concurrency safety.
- Sequence-based numbering with race-free implementation.
- Accounting period lock/unlock with approval audit trail.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Performance | 6/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
