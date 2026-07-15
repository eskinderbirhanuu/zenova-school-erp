# File Reviewed

`backend/app/schemas/finance.py` (344 lines)

## Schemas

Comprehensive financial schemas: Account, JournalEntry/Line, FeeType, FeeStructure, FeeAssignment, Invoice, Payment, Wallet, WalletTransaction, Scholarship, AccountingPeriod, PayrollRun/Item, Budget/Item, PurchaseRequest/Order, TrialBalance.

## Issues

### Issue 1 — Comprehensive Financial Schema

- **Lines:** 1-344
- **Severity:** Good
- **Category:** Architecture
- **Description:** Full double-entry accounting, fee management, payroll, budgeting, procurement, and trial balance reporting.

### Issue 2 — `InvoiceCreate.lines` Uses `list[dict]` Instead of Typed Model

- **Lines:** 128
- **Severity:** Low
- **Category:** Type Safety
- **Description:** Invoice lines are `list[dict]` — no Pydantic validation on line items.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
