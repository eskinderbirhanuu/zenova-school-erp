# File Reviewed

`backend/app/models/school_transaction.py` (20 lines)

## Model

- `SchoolTransaction` — `school_id`, `student_id`, `invoice_id`, `payment_id`, `payment_method`, `amount`, `transaction_reference`, `payment_date`.

## Issues

### Issue 1 — All FKs Are Nullable Except `school_id`

- **Lines:** 11-14
- **Severity:** Note
- **Category:** Architecture
- **Description:** Denormalized read-model combining invoice/payment/student for easy reporting.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
