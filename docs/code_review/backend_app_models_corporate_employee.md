# File Reviewed

`backend/app/models/corporate_employee.py` (28 lines)

## Model

- `CorporateEmployee` — `employee_id` (unique, indexed), `user_id` (unique FK), `full_name`, `email` (unique), `phone`, `department_id` FK, `position`, `status`, `photo_url`, `employment_date`/`type`, `created_by`.

## Issues

### Issue 1 — No `school_id` Field

- **Lines:** 8-28
- **Severity:** Low
- **Category:** Architecture
- **Description:** Corporate employees are not school-scoped. Intentional.

### Issue 2 — Three Unique Constraints

- **Lines:** 12, 13, 15
- **Severity:** Note
- **Category:** Data Integrity
- **Description:** `employee_id`, `user_id`, and `email` all have unique constraints. Good data integrity.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
