# File Reviewed

`backend/app/api/v1/endpoints/staff.py` (105 lines)

## Overview

Staff management — create (with ID generation and role-based user creation), list (with role filter), get, update, and deactivate.

## Issues

### Issue 1 — Default Password "changeme123" Hardcoded

- **Lines:** 26
- **Severity:** Low
- **Category:** Security
- **Description:** If no password is provided, defaults to `"changeme123"`. Should be configurable or require explicit password.

### Issue 2 — `create_staff` Constructs `StaffResponse` Manually

- **Lines:** 48-61
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Manual field mapping from service result dict. Should use `model_validate`.

### Issue 3 — `update_staff` Always Uses `include_deleted=True`

- **Lines:** 95
- **Severity:** Low
- **Category:** Functionality
- **Description:** Allows updating soft-deleted staff. Acceptable for admin recovery.

### Issue 4 — `deactivate_staff` Returns 200 Instead of 204

- **Lines:** 99, 105
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Returns `200 OK` with the service result (which may be a dict). Unlike `delete_student` which returns 204.

### Issue 5 — No Pagination on List

- **Lines:** 64-72
- **Severity:** Low
- **Category:** Performance
- **Description:** Staff list has no skip/limit. For large schools, this could be slow.

## Security Review

- STAFF_CREATE for write operations.
- School_id scoping.

## Performance Review

- No pagination on list.

## Maintainability

- Clean structure.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
