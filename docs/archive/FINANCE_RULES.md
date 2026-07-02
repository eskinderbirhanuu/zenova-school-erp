# ZENOVA FINANCE SYSTEM — MASTER SPECIFICATION

## IMPORTANT
This is THE MOST IMPORTANT MODULE in ZENOVA.
Must follow real accounting principles.
No shortcuts. Enterprise-grade only.

---

## Core Accounting Rules

### Double Entry Accounting
Every financial transaction MUST follow double-entry accounting:
- **Every entry has at least two lines**: one debit, one credit
- **Total Debits MUST equal Total Credits**
- If debits ≠ credits, the system REJECTS the entry

### Chart of Accounts (5 Types)

| Type | Code | Normal Side | Examples |
|------|------|-------------|----------|
| Assets | 1 | Debit | Cash, Bank, Receivables, Equipment |
| Liabilities | 2 | Credit | Payables, Loans, Accruals |
| Equity | 3 | Credit | Capital, Retained Earnings |
| Revenue | 4 | Credit | Tuition Fees, Admission Fees |
| Expenses | 5 | Debit | Salaries, Utilities, Supplies |

### Account Numbering Convention
```
1-1000  Cash
1-1100  Bank Accounts
1-2000  Accounts Receivable (Student Fees)
1-3000  Equipment
2-1000  Accounts Payable
3-1000  Retained Earnings
4-1000  Tuition Revenue
4-2000  Admission Revenue
5-1000  Salary Expense
5-2000  Utility Expense
```

---

## Journal Entry Rules

### Validation
```python
total_debit = sum(line.debit for line in entry.lines)
total_credit = sum(line.credit for line in entry.lines)
if abs(total_debit - total_credit) > 0.001:
    REJECT: "Debit must equal Credit"
```

### Requirements
- Minimum 2 lines per entry
- Every line links to a valid account in Chart of Accounts
- Entry date must be within an unlocked accounting period
- Description is required
- Created by user is recorded

### Example: Student Fee Payment
```
Journal Entry: JE-2026-00001
Date: 2026-06-22
Description: Tuition payment - Abebe Kebede

Line 1: 1-1000 (Cash)           DEBIT   5,000.00
Line 2: 1-2000 (Receivables)    CREDIT  5,000.00
                              ────────────────
                              DEBIT    5,000.00
                              CREDIT   5,000.00  ✓ Balanced
```

### Example: Salary Payment
```
Journal Entry: JE-2026-00002
Date: 2026-06-30
Description: June 2026 salaries

Line 1: 5-1000 (Salary Exp)     DEBIT   50,000.00
Line 2: 2-1000 (Salary Payable) CREDIT  50,000.00
                              ────────────────
                              DEBIT    50,000.00
                              CREDIT   50,000.00  ✓ Balanced
```

---

## Security & Anti-Fraud Controls

### 1. No Hard Delete
Financial records can NEVER be deleted. Only reversed.

### 2. Reversal Only
To correct an error:
1. Create reversal entry (opposite debits/credits)
2. Create new correct entry
3. Original entry marked as `reversed`
4. Reversal linked to original via `reversed_entry_id`

### 3. Period Locking
- Accounting periods (months/quarters) can be LOCKED
- No entries allowed in locked periods
- Only SUPER_ADMIN can unlock a period
- Locking prevents retroactive fraud

### 4. Approval Workflow
| Transaction | Requires Approval | Approver |
|-------------|-------------------|----------|
| Large payments (> threshold) | ✅ | DIRECTOR or ADMIN |
| Refunds | ✅ | DIRECTOR |
| Fee waivers | ✅ | DIRECTOR |
| Salary adjustments | ✅ | ADMIN |
| Normal journal entries | ❌ | FINANCE role sufficient |

### 5. Audit Trail
Every finance action is logged:

| Action | Module | Data Captured |
|--------|--------|---------------|
| ACCOUNT_CREATED | Chart of Accounts | Full account data |
| JOURNAL_POSTED | Journal | All lines, total debit, total credit |
| JOURNAL_REVERSED | Journal | Original entry, reason |
| INVOICE_CREATED | Invoicing | Student, items, amounts |
| PAYMENT_RECEIVED | Payments | Amount, method, reference |
| EXPENSE_RECORDED | Expenses | Amount, category, department |
| PAYROLL_RUN | Payroll | Period, total amounts |
| PERIOD_LOCKED | Periods | Period, locked by |
| PERIOD_UNLOCKED | Periods | Period, unlocked by |

---

## Student Billing

### Fee Types
| Fee Type | Frequency | Description |
|----------|-----------|-------------|
| Admission | One-time | Paid once at enrollment |
| Tuition | Annual/Semester | Main academic fee |
| Transport | Monthly/Annual | Bus service fee |
| Library | Annual | Library access fee |
| Cafeteria | Per-use/Prepaid | Meal plan |
| Exam | Per-exam | Examination fee |
| Custom | Flexible | User-defined fees |

### Fee Assignment
- Fees can be assigned per grade (class) or per student
- Fee structures define default amounts
- Individual overrides allowed (e.g., scholarship adjustments)

### Invoice Generation
- Invoices auto-generated from fee assignments
- Due dates based on fee structure configuration
- Overdue invoices flagged automatically
- Invoice numbering: `INV-{YEAR}-{SEQUENCE:05d}`

### Invoice Statuses
- `draft` — Not yet issued
- `issued` — Sent to student/parent
- `partial` — Partially paid
- `paid` — Fully paid
- `cancelled` — Voided
- `overdue` — Past due date

---

## Payment Methods

| Method | Code | Description |
|--------|------|-------------|
| Cash | cash | Physical cash payment |
| Bank Transfer | bank | Direct bank deposit |
| Mobile Money | mobile_money | Mobile operator payment |
| Telebirr | telebirr | Ethio Telecom mobile money |
| CBE Birr | cbe_birr | Commercial Bank of Ethiopia mobile |
| Wallet | wallet | Student wallet balance |
| Mixed Payment | mixed | Combination of methods |

### Mixed Payment Example
```
Invoice Total: 5,000.00
  Cash:          2,000.00
  Wallet:        1,500.00
  Telebirr:      1,500.00
                ─────────
  Total:         5,000.00  ✓
```

---

## Student Wallet

### Features
- Every student has a wallet
- Wallet top-up via cash, bank, mobile money
- Wallet spending in cafeteria and school services
- Real-time balance tracking
- Transaction history

### Wallet Transaction Types
| Type | Description | Balance Effect |
|------|-------------|----------------|
| Top-up | Add money | + |
| Payment | Spend money | - |
| Refund | Money returned | + |
| Withdrawal | Cash out | - |

### Accounting Integration
- Wallet top-up creates a journal entry:
  - Debit: Cash/Bank account
  - Credit: Student Wallet Liability account
- Wallet payment creates a journal entry:
  - Debit: Student Wallet Liability account
  - Credit: Revenue account

---

## Scholarship System

### Types
| Type | Description |
|------|-------------|
| Full | 100% fee waiver |
| Partial | Percentage-based discount |
| Discount | Fixed amount deduction |

### Rules
- Scholarship assigned to student for an academic year
- Fee amounts auto-adjusted based on scholarship
- Can be revoked mid-year
- Audit trail for all scholarship assignments

---

## Payroll System

### Payroll Components
| Component | Type | Description |
|-----------|------|-------------|
| Basic Salary | Earnings | Fixed monthly amount |
| Allowances | Earnings | Housing, transport, etc. |
| Bonuses | Earnings | Performance bonus |
| Overtime | Earnings | Extra hours |
| Tax | Deduction | Income tax |
| Pension | Deduction | Employee pension |
| Loan | Deduction | Salary advance repayment |

### Payroll Process
1. Create payroll run for period (e.g., June 2026)
2. System loads all active employees
3. Finance officer reviews and adjusts
4. Approver (DIRECTOR/ADMIN) approves
5. System generates journal entry
6. Payslips generated as PDF
7. Payments disbursed

### Payslip Data
- Employee name and ID
- Period
- Gross pay (salary + allowances + bonuses)
- Deductions (tax, pension, loan)
- Net pay
- Year-to-date totals

---

## Budget System

### Budget Levels
- Annual school budget
- Department budgets (Academic, Admin, Operations, etc.)
- Budget items with categories

### Budget Tracking
- Actual vs Budget comparison
- Variance calculation (% and amount)
- Alerts when spending exceeds threshold

---

## Procurement System

### Process Flow
```
1. Purchase Request (created by department)
   → Approval (DIRECTOR)
2. Purchase Order (created by FINANCE/INVENTORY)
   → Sent to Supplier
3. Goods Received (INVENTORY confirms receipt)
4. Invoice Matching (PO matches invoice)
5. Payment (FINANCE processes payment)
```

### Procurement Documents
| Document | Created By | Statuses |
|----------|------------|----------|
| Purchase Request | Any staff | draft, pending, approved, rejected |
| Purchase Order | FINANCE/INVENTORY | draft, approved, sent, partial, received, closed |
| Goods Receipt | INVENTORY | pending, completed |
| Invoice Match | FINANCE | matched, partial, unmatched |

---

## Financial Reports

| Report | Description | Access |
|--------|-------------|--------|
| **Trial Balance** | All accounts with debit/credit balances | FINANCE, ADMIN, AUDITOR |
| **General Ledger** | Account transaction history with running balance | FINANCE, ADMIN |
| **Balance Sheet** | Assets = Liabilities + Equity | FINANCE, ADMIN, DIRECTOR, AUDITOR |
| **Income Statement** | Revenue - Expenses = Net Income | FINANCE, ADMIN, DIRECTOR, AUDITOR |
| **Cash Flow** | Operating, Investing, Financing activities | FINANCE, ADMIN |
| **Revenue Report** | Revenue breakdown by fee type | FINANCE, ADMIN |
| **Expense Report** | Expenses by category and department | FINANCE, ADMIN |
| **Student Payments** | Per-student payment history and balances | FINANCE, ADMIN, REGISTRAR |
| **Payroll Report** | Payroll summary by period | FINANCE, ADMIN, HR |
| **Aging Report** | Overdue invoices by days | FINANCE, ADMIN |
| **Budget vs Actual** | Budget variance analysis | FINANCE, ADMIN, DIRECTOR |

---

## Period Locking

### Locking Rules
- Periods can be locked after month-end close
- Locked periods reject ALL new journal entries
- Periods are locked by FINANCE officer
- Only SUPER_ADMIN can unlock
- Unlocking requires an audit reason

### Lock Flow
```
1. Finance reconciles period
2. Finance clicks "Lock Period"
3. System checks: no pending entries, all balanced
4. Period locked → flag = TRUE
5. Audit log: PERIOD_LOCKED
```

---

## General Rules (Repeated for Emphasis)

✅ **Double Entry Required** — Every transaction: Debit = Credit
✅ **No Hard Delete** — Reversal only
✅ **Full Audit** — Every create, update, reverse is logged
✅ **Period Locking** — Prevents retroactive changes
✅ **Approval Workflow** — Large/value transactions need approval
❌ **No Silent Edits** — All changes recorded with old+new values
❌ **No Direct DB Edits** — All changes through API with audit
