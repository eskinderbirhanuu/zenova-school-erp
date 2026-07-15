# File Reviewed

`backend/app/api/v1/endpoints/announcements.py` (81 lines)

## Overview

Announcement endpoints — create (SCHOOL_MANAGE), list (paginated, published only), get by ID, and soft-delete.

## Issues

### Issue 1 — `create_announcement` Uses Different Model Than `communication_service`

- **Lines:** 15-31
- **Severity:** Low
- **Category:** Inconsistency
- **Description:** Direct DB model usage instead of `communication_service.create_announcement`. The endpoint creates `Announcement` directly while the service also has a `create_announcement` function.
- **Potential Impact:** audit logging in `communication_service` is bypassed.

### Issue 2 — No Update Endpoint

- **Lines:** (missing)
- **Severity:** Low
- **Category:** Functionality
- **Description:** Announcements can be created and deleted but not updated.

## Security Review

- SCHOOL_MANAGE permission on create/delete.
- School_id scoping.

## Performance Review

- Simple operations — no concern.

## Maintainability

- Clean and focused.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 8/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
