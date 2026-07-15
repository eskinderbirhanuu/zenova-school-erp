# File Reviewed

`backend/app/api/v1/endpoints/branches.py` (141 lines)

## Overview

Branch management endpoints — CRUD with school_id scoping, search by name/code, pagination, and branch creation with license validation.

## Issues

### Issue 1 — Repeated `include_deleted` Guard Logic

- **Lines:** 27-28, 88-89, 104-105
- **Severity:** Low
- **Category:** Code Quality
- **Description:** The same `is_superuser or role.name in (...) ` check for `include_deleted` is repeated. Same pattern as `academic.py`.

### Issue 2 — `create_branch` Tenant Scoping Logic Is Non-Obvious

- **Lines:** 60-63
- **Severity:** Low
- **Category:** Maintainability
- **Description:** `school_id = (data.school_id if current_user.is_superuser else None) or current_user.school_id` — the superuser branch is correct but the logic is dense.

## Security Review

- SCHOOL_MANAGE permission on create/update/delete.
- School_id scoping prevents cross-school access.

## Performance Review

- Simple CRUD — no concerns.

## Maintainability

- Well-structured with consistent patterns.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 9/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
