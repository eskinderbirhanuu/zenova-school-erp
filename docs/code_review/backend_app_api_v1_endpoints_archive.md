# File Reviewed

`backend/app/api/v1/endpoints/archive.py` (48 lines)

## Overview

Archive endpoints — view archive status (jobs, table sizes), run archive on specific or all tables, restore archived records.

## Issues

### Issue 1 — No Tenant Isolation on Archive Status

- **Lines:** 11-20
- **Severity:** Low
- **Category:** Security
- **Description:** Archive status returns all jobs (no school_id filter). Acceptable for super-admin usage.

### Issue 2 — Archive Operations Require SCHOOL_MANAGE Permission

- **Lines:** 14, 27, 43
- **Severity:** Note
- **Category:** Security
- **Description:** Permission gating is appropriate for data deletion operations.

## Security Review

- SCHOOL_MANAGE permission required.
- Table name validation before run.

## Performance Review

- Simple status/invoke endpoints.

## Maintainability

- Clean and minimal.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 7/10 |
