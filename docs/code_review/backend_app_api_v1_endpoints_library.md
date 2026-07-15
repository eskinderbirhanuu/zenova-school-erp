# File Reviewed

`backend/app/api/v1/endpoints/library.py` (121 lines)

## Overview

Library management — book categories, books (CRUD with search), borrowings (borrow/return/list), members, and fines.

## Issues

### Issue 1 — `list_members` and `list_fines` Build Dicts Manually

- **Lines:** 102-103, 119-120
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Manual dict construction with stringified values. Should use Pydantic response models.

### Issue 2 — `LIBRARY` and `VIEW_LIBRARY` Permission Groups Are Identical

- **Lines:** 15-16
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Both defined as `[require_permission(Permission.LIBRARY_MANAGE)]`. No distinction between create and view.

### Issue 3 — `list_borrowings` Does Lazy Import of `BookBorrowing`

- **Lines:** 77
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Import inside function body. Minor.

## Security Review

- LIBRARY_MANAGE permission for all operations.
- School_id scoping.

## Performance Review

- Pagination with search via `ilike` — fine for typical library sizes.

## Maintainability

- Standard CRUD pattern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
