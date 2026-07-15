# File Reviewed

`backend/app/services/cafeteria_service.py` (116 lines)

## Overview

Cafeteria ordering service — CRUD for products, order creation with stock deduction and wallet payment check, order status management with state validation.

## Issues

### Issue 1 — Negative Stock Allowed on Create

- **Lines:** 10-12
- **Severity:** Medium
- **Category:** Validation
- **Description:** No validation that `data.stock` is non-negative. A product can be created with negative stock.
- **Why it is a problem:** Negative stock can cause incorrect availability calculations.

### Issue 2 — `create_order` Imports Inside Loop

- **Lines:** 44-51
- **Severity:** Low
- **Category:** Performance
- **Description:** The `Wallet` model is imported inside the order creation method, inside the loop body. This is a minor performance concern and a code organization issue.
- **Why it is a problem:** Import overhead on every order.

### Issue 3 — No Order Total Capacity Check

- **Lines:** 30-62
- **Severity:** Medium
- **Category:** Functionality
- **Description:** No check that the total order quantity is within reasonable limits. A single order could contain 1000 items.
- **Why it is a problem:** Could be used for inventory manipulation.

### Issue 4 — `update_order_status` Allows Skipping States

- **Lines:** 103-116
- **Severity:** Low
- **Category:** Logic
- **Description:** Order status can change from "pending" to "delivered" without going through "preparing" and "ready". No state machine enforcement.
- **Why it is a problem:** Order tracking is inaccurate.

## Security Review

- `with_for_update()` on product and wallet queries — good for concurrency.
- School_id scoping on all queries.

## Performance Review

- `with_for_update()` locks rows during the transaction — correct for stock management.
- Acceptable for a cafeteria ordering system.

## Maintainability

- Clean, well-organized service.
- Valid statuses set is well-defined.

## Architecture Review

- Good use of `enqueue_sync` for offline sync capabilities.
- Wallet integration for payment is well-designed.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
