# File Reviewed

`backend/app/api/v1/endpoints/platform_commission.py` (226 lines)

## Overview

Platform commission — school director dashboard, super admin dashboard, invoice payment (via Chapa), webhook, daily/monthly revenue reports, per-school revenue breakdown.

## Issues

### Issue 1 — `pay_platform_invoice` Uses Hardcoded "chapa" Gateway

- **Lines:** 75
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `PaymentGatewayFactory.get_gateway("chapa", ...)` hardcodes the gateway type. Should use a configurable platform gateway.

### Issue 2 — `daily_revenue_report` and `monthly_revenue_report` Have No Permission Check

- **Lines:** 132-137, 157-163
- **Severity:** Medium
- **Category:** Security
- **Description:** These endpoints only require `get_current_user`, not any specific permission. Any authenticated user can view platform-wide revenue data.

### Issue 3 — `school_revenue_report` Also Lacks Permission Check

- **Lines:** 190-195
- **Severity:** Medium
- **Category:** Security
- **Description:** Same issue — any authenticated user can see per-school revenue breakdown.

### Issue 4 — Webhook Uses `with_for_update()` Correctly

- **Lines:** 120
- **Severity:** Good
- **Category:** Concurrency
- **Description:** `with_for_update()` on invoice query to prevent double-payment race conditions.

### Issue 5 — Batching Avoids N+1 on School Revenue Report

- **Lines:** 202-204
- **Severity:** Good
- **Category:** Performance
- **Description:** Batch-loads all platform fees in a single query.

## Security Review

- School dashboard requires authentication but no specific permission.
- Super admin dashboard requires AUDIT_VIEW.
- Reports lack permission checks (Issue 2, 3).
- Webhook uses signature verification.

## Performance Review

- School revenue report uses batch loading.
- Reports aggregate over all records — could be slow for large datasets.

## Maintainability

- Clean structure with clear sections.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 6/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
