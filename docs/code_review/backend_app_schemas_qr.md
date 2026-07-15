# File Reviewed

`backend/app/schemas/qr.py` (40 lines)

## Schemas

- `QRGenerateRequest`, `QRResponse`, `QRValidateResponse`, `QRHistoryResponse`.

## Issues

### Issue 1 — Regex on `reference_type`

- **Lines:** 6
- **Severity:** Good
- **Category:** Security
- **Description:** `pattern="^(student|parent|teacher|staff)$"` constrains reference type.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
