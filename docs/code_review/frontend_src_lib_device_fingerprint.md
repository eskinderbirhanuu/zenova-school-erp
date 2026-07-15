# File Reviewed

`frontend/src/lib/device-fingerprint.ts` (32 lines)

## Functions

- `getDeviceFingerprint()` — generates SHA-256 hash of browser fingerprint (canvas, UA, screen, etc.).

## Issues

### Issue 1 — Good Canvas Fingerprinting

- **Lines:** 11-22
- **Severity:** Good
- **Category:** Security
- **Description:** Canvas-based fingerprinting adds entropy for device binding.

### Issue 2 — SHA-256 via Web Crypto API

- **Lines:** 26-28
- **Severity:** Good
- **Category:** Security
- **Description:** Uses native `crypto.subtle.digest` — no library needed.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
