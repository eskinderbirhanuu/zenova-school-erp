# File Reviewed

`backend/app/api/v1/endpoints/corporate.py` (150 lines)

## Overview

Corporate management — department CRUD (with duplicate-code check), employee CRUD (with pagination, filter by department/status, lazy-load department name), and a dashboard endpoint.

## Issues

### Issue 1 — `list_employees` Constructs Response Model via `__dict__` + Extra Field

- **Lines:** 74-75
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `CorporateEmployeeResponse(**emp.__dict__, department_name=d)` — `emp.__dict__` may include SQLAlchemy internal state.
- **Better:** Use `model_validate` with explicit field mapping.

### Issue 2 — Same Pattern Repeated in `create_employee`, `get_employee`, `update_employee`

- **Lines:** 101-102, 115-116, 129-130
- **Severity:** Low
- **Category:** Code Quality
- **Description:** The `dept = emp.department.name if emp.department else None` + `CorporateEmployeeResponse(**emp.__dict__, department_name=dept)` pattern is repeated 4 times.

### Issue 3 — `create_employee` and `update_employee` Don't Validate School_ID

- **Lines:** 82-103, 119-131
- **Severity:** Low
- **Category:** Security
- **Description:** No school_id verification — corporate records appear to be cross-school (no school_id column).

## Security Review

- Permission-based access (CORPORATE_EMPLOYEE_VIEW/CREATE/EDIT, CORPORATE_DEPARTMENT_MANAGE).
- No school_id scoping (appears intentional for cross-school corporate).

## Performance Review

- Paginated employee list with department name resolution.
- Dashboard call is data-heavy but admin-only.

## Maintainability

- Clean structure with clear permission per endpoint.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
