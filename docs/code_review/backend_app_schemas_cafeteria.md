# File Reviewed

`backend/app/schemas/cafeteria.py` (42 lines)

## Schemas

- `ProductCreate`, `ProductResponse`, `ProductUpdate`, `OrderItemCreate`, `OrderStatusUpdate`, `OrderCreate`, `OrderResponse`.

## Issues

### Issue 1 — Inconsistent Semicolon Formatting

- **Lines:** 9, 13-14, 40-42
- **Severity:** Style
- **Category:** Readability
- **Description:** Multiple field declarations on one line separated by semicolons — non-standard Python style.

### Issue 2 — `ProductCreate.price` Uses Semicolons

- **Lines:** 9
- **Severity:** Low
- **Category:** Correctness
- **Description:** `price: Decimal; category: Optional[str] = None; stock: int = 0` — the semicolons work syntactically but are unusual.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 5/10 |
| Maintainability | 6/10 |
