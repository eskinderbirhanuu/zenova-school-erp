# File Reviewed

`backend/app/models/corporate_department.py` (18 lines)

## Model

- `CorporateDepartment` — name/code (both unique), `description`, `head_employee_id` (self-referencing FK), `is_active`.

## Issues

### Issue 1 — No `school_id` Field

- **Lines:** 7-18
- **Severity:** Low
- **Category:** Architecture
- **Description:** Corporate departments are cross-school (no tenant isolation). Intentional design for corporate module.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
