# File Reviewed

`backend/app/api/v1/endpoints/finance.py` (476 lines)

## Overview

Full financial subsystem — account management, journal entries (with reversal), fee types/structures/assignments, invoicing, payments with idempotency, wallet/transactions, scholarships, accounting periods (lock/unlock), payroll (runs + approve), budgets/items, purchase requests/orders (approve workflow), trial balance report, and Excel import/export.

## Issues

### Issue 1 — Massive Repeated `include_deleted` Guard (10+ Occurrences)

- **Lines:** 51, 79, 85, 105, 140, 166, 194, 211, 227, 243, 270, 305, 334, 358, 383, 403
- **Severity:** Low
- **Category:** Code Quality
- **Description:** The `is_superuser or role.name in ('ADMIN', 'SUPER_ADMIN')` pattern is repeated 16+ times across the file. This is the worst offender in the codebase for this pattern.

### Issue 2 — `FINANCE`, `FINANCE_DIRECTOR`, `FINANCE_ADMIN`, `VIEW_FINANCE` Permission Groups Are Identical

- **Lines:** 35-38
- **Severity:** Low
- **Category:** Code Quality
- **Description:** All four permission groups contain `require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS)` (with VIEW_FINANCE adding `Permission.AUDIT_VIEW`). The groups are not actually distinct.

### Issue 3 — Excel Bulk Import Lacks Validation

- **Lines:** 418-436
- **Severity:** Medium
- **Category:** Security
- **Description:** `import_payments_excel()` parses the uploaded Excel file and creates `Payment` objects directly from `row.get(...)` without validating column existence, data types, or that referenced `invoice_id`/`student_id` exist. Missing fields become `None`.

### Issue 4 — Excel Export Format Is Inconsistent with Import

- **Lines:** 447-452, 471-476
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Excel export builds rows manually as lists. No shared format definition between import and export.

### Issue 5 — `get_wallet_transactions` Uses `wallet.id` from `get_wallet`, Which Could Be Stale

- **Lines:** 228-229
- **Severity:** Low
- **Category:** Reliability
- **Description:** Not a real issue — just used to get wallet ID for subsequent query.

### Issue 6 — No Pagination on Journal Entries, Invoices, Payments, Purchase Requests/Orders List Endpoints

- **Lines:** 74, 188, 205, 378, 398
- **Severity:** Low
- **Category:** Performance
- **Description:** These endpoints use offset/limit pattern (skip/limit) but delegate to service layer rather than using the `paginate` helper.

### Issue 7 — `idempotency_key` Required but Enforcement Is in Service Layer

- **Lines:** 200-201
- **Severity:** Good
- **Category:** Security
- **Description:** Idempotency key check at the endpoint level before calling service. Good for preventing duplicate payments.

## Security Review

- Permission groups for different finance operations (create, view, approve).
- Idempotency key required for payments.
- Excel import bypasses normal payment validation (Issue 3).
- School_id scoping throughout.

## Performance Review

- Several endpoints skip pagination (Issue 6).
- Excel export could be large.

## Maintainability

- High repetition of the `include_deleted` guard.
- Permission groups not meaningfully differentiated.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 6/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 6/10 |
