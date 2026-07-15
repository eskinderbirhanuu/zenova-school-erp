# File Reviewed

`backend/app/models/receipt.py` (47 lines)

## Models

- `Receipt` — `receipt_number` (unique), `payment_id`, `invoice_id`, `student_id`, `parent_id`, `school_id`, payment details, `cashier_name`, `qr_code_data`, `status`.
- `ReceiptLine` — `receipt_id`, `invoice_line_id`, `description`, `amount`.

## Issues

### Issue 1 — `qr_code_data` Stores Base64 QR

- **Lines:** 29
- **Severity:** Note
- **Category:** Architecture
- **Description:** Base64-encoded QR data embedded in receipt. Good for offline verification.

### Issue 2 — Redundant `school_id` on `ReceiptLine`

- **Lines:** 38-47
- **Severity:** Low
- **Category:** Data Redundancy
- **Description:** `ReceiptLine` inherits school context from `Receipt`.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
