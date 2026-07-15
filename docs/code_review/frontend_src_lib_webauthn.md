# File Reviewed

`frontend/src/lib/webauthn.ts` (100 lines)

## Functions

- `registerPasskey(deviceName?)` — WebAuthn credential registration.
- `authenticateWithPasskey()` — WebAuthn assertion flow.
- `listPasskeys()`, `deletePasskey(id)` — credential management.

## Issues

### Issue 1 — Good WebAuthn Implementation

- **Lines:** 14-81
- **Severity:** Good
- **Category:** Security
- **Description:** Full passkey registration and authentication flow using browser WebAuthn API.

### Issue 2 — Hardcoded RP_ID and ORIGIN at Module Level

- **Lines:** 3-4
- **Severity:** Low
- **Category:** Security
- **Description:** `RP_ID`/`ORIGIN` read from `window.location` at module load time. Could be derived from config.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 9/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
