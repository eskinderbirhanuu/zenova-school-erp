# File Reviewed

`backend/app/services/notification_service.py` (101 lines)

## Overview

Absence notification service — sends in-app, email, and Telegram notifications to parents when their child is marked absent.

## Issues

### Issue 1 — N+1 Queries for Each Parent

- **Lines:** 51-98
- **Severity:** Medium
- **Category:** Performance
- **Description:** For each linked parent, individual queries fetch Parent, User, and NotificationPreference. With 50 parents linked to a student, that's 150+ queries.
- **Why it is a problem:** Slow notification for large schools.
- **Potential Impact:** High database load during bulk attendance marking.

### Issue 2 — `asyncio.ensure_future` in Synchronous Context

- **Lines:** 92
- **Severity:** Medium
- **Category:** Reliability
- **Description:** Same issue as `communication_service.py` — `ensure_future` outside a running event loop may fail silently.
- **Why it is a problem:** Telegram notifications never arrive.
- **Potential Impact:** Parents don't receive Telegram notifications.

### Issue 3 — No Telegram Message Length Validation

- **Lines:** 92-99
- **Severity:** Low
- **Category:** Reliability
- **Description:** Telegram has a 4096-character limit per message — not a concern here with short messages.

## Security Review

- School_id scoped on all queries.

## Performance Review

- N+1 query pattern is the main concern.

## Maintainability

- Clean multi-channel notification approach.
- Preference-respecting delivery is well-implemented.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 5/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
