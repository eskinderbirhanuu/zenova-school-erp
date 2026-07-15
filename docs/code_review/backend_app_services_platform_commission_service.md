# File Reviewed

`backend/app/services/platform_commission_service.py` (342 lines)

## Overview

Platform commission service — records per-transaction platform fees (5 ETB), generates monthly invoices, handles payment, school/super-admin dashboards, daily fee calculation, and monthly invoice generation.

## Issues

### Issue 1 — `get_super_admin_dashboard` Queries Per-School in Loop

- **Lines:** 252-273
- **Severity:** Medium
- **Category:** Performance
- **Description:** Loads all active schools and queries each one individually for transaction count and revenue. N+1 query pattern across all schools.
- **Why it is a problem:** With 500 schools, this generates 501+ queries.
- **Potential Impact:** Slow super-admin dashboard.
- **Recommended Fix:** Use GROUP BY queries to fetch all schools' data in 2 queries.

### Issue 2 — `run_daily_fee_calculation` Processes All Payments for Today

- **Lines:** 287-317
- **Severity:** Medium
- **Category:** Performance
- **Description:** Loads all payments for today into memory and processes them one by one. For high-volume schools, this could be thousands.
- **Why it is a problem:** Memory usage and long-running job.

### Issue 3 — `run_monthly_invoice_generation` Fetches All School IDs Into Memory

- **Lines:** 325-330
- **Severity:** Low
- **Category:** Performance
- **Description:** `.distinct().all()` loads all school IDs into memory. Acceptable.

### Issue 4 — Hardcoded Platform Fee Rate

- **Lines:** 17
- **Severity:** Low
- **Category:** Maintainability
- **Description:** `PLATFORM_FEE_PER_TRANSACTION = Decimal("5.00")` is hardcoded. No per-school or per-plan configurability.
- **Potential Impact:** Cannot charge different rates for different school tiers.

### Issue 5 — `generate_monthly_invoice` No Transaction, Partial Fee Generation Risk

- **Lines:** 86-125
- **Severity:** Medium
- **Category:** Reliability
- **Description:** If the function fails partway (e.g., after marking fees as "invoiced"), there's no DB transaction wrapping. Fees could be marked invoiced without an invoice record.
- **Why it is a problem:** Orphaned invoiced fees with no associated invoice.
- **Recommended Fix:** Wrap the entire function in a DB transaction.

## Security Review

- School_id scoping on all queries.
- Audit logging on invoice payment.

## Performance Review

- N+1 query in super-admin dashboard is the main concern.
- Daily job is acceptable for moderate volume.

## Maintainability

- Well-structured with clear fee, invoice, and dashboard separation.
- The `_next_invoice_number` pattern is consistent with `id_service.py`.

## Architecture Review

- Platform commission model is well-designed: transaction → fee → invoice → payment.
- The flat-rate per-transaction fee is simple but lacks configurability.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 5/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
