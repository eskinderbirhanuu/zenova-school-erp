# File Reviewed

`backend/app/models/procurement.py` (48 lines)

## Models

- `PurchaseRequest` — `pr_number`, `requested_by`, `department`, `description`, `estimated_amount`, `status`, `approved_by`.
- `PurchaseOrder` — `po_number`, `purchase_request_id`, `supplier`, `total_amount`, `status`.
- `GoodsReceipt` — `gr_number`, `purchase_order_id`, `received_by`, `status`.

## Issues

### Issue 1 — Good Procurement Workflow Model

- **Lines:** 7-48
- **Severity:** Good
- **Category:** Architecture
- **Description:** Three-stage model (PR → PO → GR) covers the procurement lifecycle. Each has unique document numbers.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
