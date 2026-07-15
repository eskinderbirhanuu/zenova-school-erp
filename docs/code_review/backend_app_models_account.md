# File Reviewed

`backend/app/models/account.py` (21 lines)

## Overview

Chart of Accounts model — defines account numbers, types (asset, liability, equity, revenue, expense), normal side (debit/credit), and hierarchical parent-child relationships.

## Issues

### Issue 1 — `account_type` Is Free-Text String

- **Line:** 13
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `account_type` is `String(20)` with no enum constraint. Standard accounting types are: asset, liability, equity, revenue, expense.
- **Why it is a problem:** Invalid account types can be stored, breaking financial reports.
- **Potential Impact:** P&L and balance sheet reports will fail or show incorrect categorization.
- **Recommended Fix:** Use an `AccountType` enum (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE).

### Issue 2 — `normal_side` Is Free-Text String

- **Line:** 14
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `normal_side` is `String(6)` with no enum validation. Valid values are "debit" or "credit".
- **Why it is a problem:** If an account has an invalid normal side, journal line validation can't work correctly.
- **Potential Impact:** Incorrect financial statement classification.
- **Recommended Fix:** Use a Boolean `is_debit_normal` or an enum.

### Issue 3 — `account_number` Not Unique

- **Line:** 11
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `account_number` is `String(20)` with no unique constraint. Two accounts could share the same number.
- **Why it is a problem:** Account numbers are the standard identifier in accounting systems. Duplicates break everything.
- **Potential Impact:** Journal entries posting to the wrong account. Reconciliation failures.
- **Recommended Fix:** Add a unique constraint on `(school_id, account_number)`.

## Security Review

- No security issues — this is a general ledger structure model.

## Performance Review

- No performance concerns.

## Maintainability

- Clean, minimal model.
- Hierarchical via `parent_id` self-reference — supports account groups.

## Architecture Review

- Chart of Accounts is correctly structured with parent-child hierarchy.
- Missing enum constraints for account_type and normal_side are data quality risks.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 10/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
