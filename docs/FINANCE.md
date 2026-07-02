# Finance System

THE MOST IMPORTANT MODULE. Double-entry accounting with full audit trail.

## Core Principles

1. **Double Entry Accounting** — Every journal entry: Debit = Credit
2. **No silent edits** — Transactions cannot be modified; only reversed
3. **Reversal-only** — Corrections use reversing journal entries with mandatory reason
4. **Approval workflows** — Sensitive operations require approval
5. **Period locking** — Closed periods cannot be modified (SUPER_ADMIN can unlock)
6. **Everything traceable** — Every transaction links back to source documents

## Chart of Accounts

Tree structure with parent-child relationships:
- **Assets** (1000–1999): Cash, Bank, Receivables, Inventory
- **Liabilities** (2000–2999): Payables, Accruals
- **Equity** (3000–3999): Retained Earnings, Capital
- **Revenue** (4000–4999): Tuition Fees, Transport Fees, etc.
- **Expenses** (5000–5999): Salaries, Utilities, Supplies

## Journal Engine

- `journal_entries` — Header record with date, description, reference
- `journal_lines` — Line items, each with account_id, debit, credit
- Validation: sum(debits) = sum(credits) per entry
- `General Ledger` — Real-time balance per account (computed from journal lines)

## Accounting Periods

- Monthly periods per academic year
- Locked after close: no new entries in locked period
- SUPER_ADMIN can unlock any period
- Period locking enforced at API level

## Student Billing

### Fee Types
Admission, Tuition, Transport, Library, Cafeteria, Exam, Custom

### Fee Structures
Recurring (monthly/term/yearly) or one-time fee templates.

### Invoices
- Auto-generated from fee assignments
- `paid_amount` field (manual update — not auto-synced with payments)
- `balance` = total - paid_amount
- PDF export (not yet implemented)

### Payments
Multiple methods: Cash, Bank Transfer, Mobile Money, Telebirr, CBE Birr, Wallet
Payments recorded against invoices; no over-payment enforcement.

## Student Wallet

- Each student has a wallet
- Top-up via cash or bank transfer
- Spend at cafeteria, library fines
- `Wallet.balance` stored as column (no trigger to sync with `wallet_transactions`)
- **Risk**: balance can drift from computed sum of transactions

## Scholarship System

Full, Partial, Discount types. Applied to fee assignments.

## Payroll

- `payroll_runs` — Pay period header
- `payroll_items` — Per-employee: salary, allowances, bonuses, deductions, overtime
- Payslip generation not implemented
- No automated payroll calculation engine

## Budget

- Annual and departmental budgets
- `budget_items` with category and amount
- Variance tracking against actual spend
- No overage enforcement (spending can exceed budget)

## Procurement

Purchase Request → Purchase Order → Goods Receipt → Invoice Match workflow.

## Financial Reports

| Report | Status |
|--------|--------|
| Trial Balance | ✅ Implemented |
| Balance Sheet | ✅ Implemented |
| Income Statement (P&L) | ✅ Implemented |
| Cash Flow Statement | ✅ Implemented |
| General Ledger Detail | ✅ Implemented |
| Accounts Receivable | ✅ Implemented |
| Accounts Payable | ✅ Implemented |

## Security Fixes Applied (June 29)

- Audit params added to financial mutations (IP, user_agent)
- Auto-posting to General Ledger on journal entry creation
- Idempotency keys for payment processing
- Concurrency lock on wallet transactions
- Wallet transactions now post to GL
- Over-payment blocked on invoices
- Accounting period locking enforced at API level
