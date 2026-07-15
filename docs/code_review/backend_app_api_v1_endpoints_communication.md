# File Reviewed

`backend/app/api/v1/endpoints/communication.py` (167 lines)

## Overview

Announcements (admin create + all-view), notifications (list with unread filter, mark-read, mark-all-read), messaging (send with tenant-isolated recipient lookup, list with sent-folder, batch user-name resolution), and notification preferences (auto-create on first fetch).

## Issues

### Issue 1 — `create_announcement` Uses Model Schema Directly

- **Lines:** 41-42
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Takes `AnnouncementCreate` but returns `AnnouncementResponse`. The service call passes individual fields, not the Pydantic object. Minor inconsistency.

### Issue 2 — Notification Preference Auto-Create Bypasses Validation

- **Lines:** 144-149
- **Severity:** Low
- **Category:** Validation
- **Description:** Auto-creates a default preference on GET if none exists. Acceptable pattern (lazy init), but no validation of defaults.

### Issue 3 — `list_messages` `include_sent` Filter Logic Is Non-Obvious

- **Lines:** 112-113
- **Severity:** Low
- **Category:** Readability
- **Description:** `(Message.recipient_id == current_user.id) | (Message.sender_id == current_user.id) if include_sent else (Message.recipient_id == current_user.id)` — the ternary is inside the `.filter()` argument. Works but hard to scan.

## Security Review

- Tenant-isolated recipient lookup prevents enumeration.
- ADMIN/ALL/MESSAGING permission groups for endpoints.
- Recent notification prefs are updatable by any authenticated user.
- No cross-tenant data access.

## Performance Review

- Batch user name resolution for messages.
- Pagination on list endpoints.

## Maintainability

- Well-structured with clear permission groups at top.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
