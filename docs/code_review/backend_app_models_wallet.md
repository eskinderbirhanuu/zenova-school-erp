# File Reviewed

`backend/app/models/wallet.py` (32 lines)

## Overview

Wallet and WalletTransaction models for NFC-based cafeteria and payments. Tracks student wallet balance with full transaction history (balance_before, balance_after).

## Issues

### Issue 1 — Wallet Balance Is a Stored Field Instead of Computed

- **Line:** 13
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `balance` is a stored DECIMAL field. It should be calculated from the SUM of WalletTransaction amounts.
- **Why it is a problem:** The stored balance can drift from the actual transaction history if a transaction is created without updating the balance, or if there's a race condition.
- **Potential Impact:** Wallet shows incorrect balance, leading to overspending or underspending.
- **Recommended Fix:** Remove the `balance` field and calculate it dynamically from transactions. Or use a database trigger to maintain it.

### Issue 2 — `transaction_type` Is Free-Text

- **Line:** 25
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `transaction_type` is `String(20)` with no enum constraint. Types like "credit", "debit", "payment", "refund" should be standardized.
- **Why it is a problem:** Inconsistent transaction types make financial reconciliation impossible.
- **Potential Impact:** Wallet reports will show incorrect categorization.
- **Recommended Fix:** Use a `WalletTransactionType` enum (CREDIT, DEBIT, PAYMENT, REFUND, ADJUSTMENT).

### Issue 3 — No `created_by` or `approved_by` on WalletTransaction

- **Lines:** 19-32
- **Severity:** Medium
- **Category:** Audit
- **Description:** WalletTransaction has no user who created or approved the transaction. There's no audit trail for wallet operations.
- **Why it is a problem:** If a wallet balance is wrong, there's no way to trace who made each transaction.
- **Potential Impact:** Fraud or errors in wallet operations can't be investigated.
- **Recommended Fix:** Add `created_by` (FK to users) and `approved_by` (FK to users) fields.

## Security Review

- Wallet transactions include balance_before and balance_after — good for integrity checking.
- Links to journal entries — good for double-entry accounting.

## Performance Review

- UUID primary keys.
- Index on `school_id` for tenant isolation.

## Maintainability

- Clean, well-structured model pair (Wallet + WalletTransaction).
- `balance_before` and `balance_after` provide audit trail for each transaction.

## Architecture Review

- Stored balance is a concern — computed balances are more reliable.
- The wallet system is correctly integrated with the journal system via `journal_entry_id`.
- Missing user attribution for transactions is an audit gap.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
