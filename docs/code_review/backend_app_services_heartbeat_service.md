# File Reviewed

`backend/app/services/heartbeat_service.py` (85 lines)

## Overview

Heartbeat service — periodically sends server identity, license key, and HMAC-signed payload to the license server for online license validation. Uses httpx for HTTP POST with configurable timeout.

## Issues

### Issue 1 — `_generate_hmac` Uses SHA-256 Without Salt

- **Lines:** 21-22
- **Severity:** Low
- **Category:** Security
- **Description:** HMAC uses `sync_secret` directly as the key. No salting or key derivation.
- **Why it is a problem:** If `sync_secret` is compromised, all heartbeats can be forged.

### Issue 2 — `send_heartbeat` Stores `last_heartbeat_error` on Network Failure

- **Lines:** 63-64
- **Severity:** Low
- **Category:** Operations
- **Description:** The full error message is truncated to 500 chars and stored in the DB. Could contain sensitive network path info.
- **Why it is a problem:** Error messages may leak internal network topology.

### Issue 3 — `sync_secret` Fallback to Hardcoded String

- **Lines:** 32
- **Severity:** Medium
- **Category:** Security
- **Description:** `settings.sync_secret or "dev-heartbeat-secret"` — if no sync_secret is configured, a known string is used.
- **Why it is a problem:** HMAC authentication is trivially bypassed.
- **Potential Impact:** Anyone can send fake heartbeats to the license server.

## Security Review

- HMAC-based authentication prevents basic tampering.
- Dev fallback secret is concerning.

## Performance Review

- Single HTTP request per heartbeat — no concerns.

## Maintainability

- Clean and well-structured.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
