# File Reviewed

`backend/app/models/monthly_platform_invoice.py` (22 lines)

## Model

- `MonthlyPlatformInvoice` — per-school monthly: `month`, `year`, `transaction_count`, `total_amount`, `status`, `invoice_number` (unique), `payment_reference`, `paid_at`.

## Issues

### Issue 1 — Clean Invoice Tracking Model

- **Lines:** 7-22
- **Severity:** Good
- **Category:** Architecture
- **Description:** Unique `invoice_number`, indexed `status`, `payment_reference` for reconciliation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
