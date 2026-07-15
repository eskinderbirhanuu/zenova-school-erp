# File Reviewed

`backend/app/api/v1/endpoints/schools.py` (118 lines)

## Overview

School management — get/update my school, list all (with branch count batch-load), get by ID. Super admin only for list/get.

## Issues

### Issue 1 — Branch Count Batch-Load Is Correct

- **Lines:** 93-97
- **Severity:** Good
- **Category:** Performance
- **Description:** Uses single GROUP BY query to load branch counts instead of N+1.

### Issue 2 — Inline Pydantic Model for SchoolUpdate

- **Lines:** 14-20
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `SchoolUpdate` defined inline rather than in schemas module.

## Security Review

- get/put `/schools/me` for school-level users.
- list/get schools restricted to super admin.

## Performance Review

- Batch branch count loading.
- Search uses `ilike` — fine for school names.

## Maintainability

- Clean and focused.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
