# File Reviewed

`frontend/src/components/layout/notification-bell.tsx` (71 lines)

## Component

- `NotificationBell` — dropdown button with WebSocket live notifications, REST fallback, mark-as-read.

## Issues

### Issue 1 — Good Real-Time Notification Pattern

- **Lines:** 16-38
- **Severity:** Good
- **Category:** Architecture
- **Description:** WebSocket connection with REST fallback and retry.

### Issue 2 — Token in Local Storage

- **Lines:** 14
- **Severity:** Medium
- **Category:** Security
- **Description:** `access_token` stored in `localStorage` — vulnerable to XSS. Should use httpOnly cookies.

### Issue 3 — `any` Types

- **Lines:** 9, 21, 31, 44, 61
- **Severity:** Low
- **Category:** Type Safety
- **Description:** Notification data typed as `any`.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 5/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
