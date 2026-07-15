# File Reviewed

`backend/app/services/inventory_service.py` (185 lines)

## Overview

Inventory management service — CRUD for categories, items, suppliers, and stock movement recording with quantity tracking.

## Issues

### Issue 1 — SKU Uniqueness Not Enforced

- **Lines:** 25-36
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `create_item` accepts `data.sku` but doesn't check for duplicate SKUs within the school.
- **Why it is a problem:** Multiple items with the same SKU cause confusion in procurement and stock management.

### Issue 2 — Negative Quantity Allowed on Item Creation

- **Lines:** 25-36
- **Severity:** Medium
- **Category:** Validation
- **Description:** No validation that `data.quantity` is non-negative. Items can be created with negative stock.

### Issue 3 — `update_item` / `update_category` / `update_supplier` Have Optional `school_id`

- **Lines:** 39-61, 120-136, 153-173
- **Severity:** Medium
- **Category:** Security
- **Description:** `school_id` defaults to `None`. If called without school_id, the record is looked up by ID only.
- **Why it is a problem:** Cross-school access is possible.
- **Potential Impact:** Tenant isolation bypass.

## Security Review

- School_id filtering is inconsistent — some functions don't require it.
- Audit logging on all mutations.

## Performance Review

- Simple CRUD — no concerns.

## Maintainability

- Clean CRUD patterns.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
