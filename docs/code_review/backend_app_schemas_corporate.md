# File Reviewed

`backend/app/schemas/corporate.py` (78 lines)

## Schemas

- Department, Employee — Create/Update/Response variants.
- `CorporateEmployeeResponse` includes `department_name` and `role_name` (denormalized).
- `CorporateDashboardResponse` with aggregate stats.

## Issues

### Issue 1 — Good Pydantic v2 With Descriptions

- **Lines:** 32, 74-78
- **Severity:** Good
- **Category:** Architecture
- **Description:** Uses `Field(..., description="...")` and `from_attributes=True`.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
