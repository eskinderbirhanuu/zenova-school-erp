# File Reviewed

`backend/app/services/event_service.py` (54 lines)

## Overview

Event management service — CRUD for school events with type filtering and audit logging.

## Issues

### Issue 1 — `update_event` `school_id` Defaults to `None`

- **Lines:** 19-33
- **Severity:** Medium
- **Category:** Security
- **Description:** `school_id` defaults to `None`. If called without a school_id, the event is looked up by ID only — cross-school access is possible.
- **Why it is a problem:** An admin could update an event from another school.
- **Potential Impact:** Tenant isolation bypass.
- **Recommended Fix:** Make `school_id` required (remove default None).

### Issue 2 — `update_event` and `delete_event` Have `include_deleted` Parameter

- **Lines:** 19, 44
- **Severity:** Low
- **Category:** Functionality
- **Description:** Both allow operating on soft-deleted events when `include_deleted=True`.
- **Why it is a problem:** An event that was deleted could be restored by update.

## Security Review

- `school_id` filter present but optional — see Issue 1.
- Audit logging on all operations.

## Performance Review

- Trivially simple — no concerns.

## Maintainability

- Clean CRUD service.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
