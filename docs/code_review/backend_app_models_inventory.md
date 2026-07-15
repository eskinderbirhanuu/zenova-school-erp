# File Reviewed

`backend/app/models/inventory.py` (62 lines)

## Models

- `InventoryCategory` — name, `description`, `school_id`.
- `InventoryItem` — `sku`, name, `category_id`, `unit`, `quantity`/`min_quantity`/`unit_price` (DECIMAL).
- `StockMovement` — `item_id`, `movement_type`, `quantity`, `reference`, `notes`.
- `Supplier` — name, `contact_person`, `phone`, `email`, `address`.

## Issues

### Issue 1 — Good Use of DECIMAL for Quantities

- **Lines:** 27-29
- **Severity:** Good
- **Category:** Data Integrity
- **Description:** DECIMAL(15,2) for quantity, min_quantity, and unit_price avoids floating-point errors.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
