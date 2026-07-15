# File Reviewed

`backend/app/api/v1/endpoints/hr.py` (155 lines)

## Overview

HR management — contract creation/list/termination, leave types, leave requests (request/approve/reject), leave balances, performance reviews, and job postings list.

## Issues

### Issue 1 — Repeated `include_deleted` Guard (6 Occurrences)

- **Lines:** 38, 67, 82, 119, 134, 153
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Standard pattern repeated.

### Issue 2 — `terminate_contract` Parses `end_date` from Query Param

- **Lines:** 54-56
- **Severity:** Low
- **Category:** Validation
- **Description:** `end_date` is a query string parsed via `date.fromisoformat`. Should use a proper Pydantic schema for validation and error messages.

### Issue 3 — `list_jobs` Doesn't Use Pagination Helper

- **Lines:** 149-155
- **Severity:** Low
- **Category:** Consistency
- **Description:** Uses `skip`/`limit` with direct query, unlike other list endpoints that use `paginate`.

### Issue 4 — Permission Groups `HR` and `HR_ADMIN` Are Identical

- **Lines:** 22-23
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Both defined as `[require_permission(Permission.HR_MANAGE)]`.

## Security Review

- HR_MANAGE/STAFF_CREATE permission groups.
- School_id scoping via staff join.

## Performance Review

- Paginated list endpoints.

## Maintainability

- Consistent with other CRUD endpoints.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
