# File Reviewed

`backend/app/api/v1/endpoints/ws.py` (42 lines)

## Overview

WebSocket endpoints — `/ws/notifications` (per-user notification stream) and `/ws/nfc-scans` (global NFC scan broadcast). Token-authenticated via query parameter.

## Issues

### Issue 1 — Token in Query Parameter Is Logged by Default

- **Lines:** 10, 30
- **Severity:** Medium
- **Category:** Security
- **Description:** Access token is passed as a WebSocket query parameter. Query parameters are typically logged by reverse proxies and application servers, potentially leaking JWTs.

### Issue 2 — `ws_nfc_scans` Connects with Global Scope

- **Lines:** 35
- **Severity:** Low
- **Category:** Security
- **Description:** NFC scan WebSocket is global — any authenticated user receives all NFC scans. No school_id scoping.

### Issue 3 — Proper Cleanup on Disconnect

- **Lines:** 23-24, 25-26, 39-40, 41-42
- **Severity:** Good
- **Category:** Reliability
- **Description:** Both exceptions handled properly.

## Security Review

- Token-based authentication via query parameter (Issue 1).
- NFC scans are global (Issue 2).

## Performance Review

- WebSocket connections are lightweight.

## Maintainability

- Clean and focused.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 6/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
