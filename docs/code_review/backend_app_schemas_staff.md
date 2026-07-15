# File Reviewed

`backend/app/schemas/staff.py` (52 lines)

## Schemas

- `StaffCreate` (with role pattern validation), `StaffResponse`, `StaffUpdate`, `StaffListResult`.

## Issues

### Issue 1 — Regex Role Validation

- **Lines:** 9
- **Severity:** Good
- **Category:** Security
- **Description:** `pattern="^(REGISTRAR|FINANCE|HR|INVENTORY|LIBRARY|CAFETERIA|AUDITOR)$"` constrains staff roles.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
