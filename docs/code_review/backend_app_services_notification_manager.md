# File Reviewed

`backend/app/services/notification_manager.py` (36 lines)

## Overview

WebSocket notification manager — maintains per-user WebSocket connections and pushes real-time notifications. Singleton `notification_manager` instance used across the codebase.

## Issues

### Issue 1 — No Connection Cleanup on User Logout

- **Lines:** 17-21
- **Severity:** Medium
- **Category:** Resource Management
- **Description:** `disconnect` only removes the specific WebSocket from the user's list. If the user disconnects uncleanly (browser crash), stale connections are cleaned on next push (lines 26-33). However, there's no timeout-based cleanup for connections that never receive a push.
- **Why it is a problem:** Stale connections accumulate if the user never receives another notification.
- **Potential Impact:** Memory leak over long periods.

### Issue 2 — No Connection Limit Per User

- **Lines:** 11-15
- **Severity:** Low
- **Category:** Security
- **Description:** A user could open unlimited WebSocket connections, each consuming server resources.
- **Why it is a problem:** Resource exhaustion potential.
- **Potential Impact:** Server memory pressure.

## Security Review

- No authentication in the manager itself — caller is expected to validate the user.

## Performance Review

- Cleanup on push is efficient.
- Dict-based lookup is O(1).

## Maintainability

- Simple, clean implementation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 6/10 |
