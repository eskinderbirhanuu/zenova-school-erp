# File Reviewed

`backend/app/schemas/nfc_v2.py` (128 lines)

## Schemas

Card response schemas: `StudentCardResponse`, `StaffCardResponse`, `ParentCardResponse`, `EmployeeCardResponse` (all with `from_attributes=True`).
NFC operations: `NfcAssignRequest`, `BulkAssignItem`, `BulkAssignResult`, `NfcScanRequest/Response`, `CardPrintRequestCreate/Response`, `NfcScanLogResponse`.

## Issues

### Issue 1 — Regex Pattern Validation on Card Types and Scan Types

- **Lines:** 64, 68, 71, 82, 97
- **Severity:** Good
- **Category:** Security
- **Description:** Uses `pattern="^(student|staff|parent|employee)$"` and `^(attendance|library|cafeteria|gate|verification)$` for input validation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
