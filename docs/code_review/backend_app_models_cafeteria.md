# File Reviewed

`backend/app/models/cafeteria.py` (44 lines)

## Models

- `CafeteriaProduct` — name, `price`, `category`, `stock`, `school_id`.
- `CafeteriaOrder` — `customer_type`/`customer_id` (polymorphic), `total`, `status`, `payment_method`, `school_id`.
- `CafeteriaOrderItem` — `order_id` FK, `product_id` FK, `quantity`, `unit_price`.

## Issues

### Issue 1 — Polymorphic `customer_id` Has No FK Constraint

- **Lines:** 25
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `customer_id` is a string without a ForeignKey — no referential integrity.

### Issue 2 — `CafeteriaOrderItem` Has Redundant `school_id`

- **Lines:** 40
- **Severity:** Low
- **Category:** Data Redundancy
- **Description:** Redundant with `CafeteriaOrder.school_id`.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
