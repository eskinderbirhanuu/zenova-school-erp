# File Reviewed

`backend/app/services/webauthn_service.py` (214 lines)

## Overview

WebAuthn service — passwordless authentication with challenge generation, COSE key parsing (EC2/RSA), attestation verification for registration, and assertion verification for login.

## Issues

### Issue 1 — Weird Manual CBOR Fallback for COSE Key Parsing

- **Lines:** 69-79
- **Severity:** Low
- **Category:** Code Quality
- **Description:** The manual CBOR fallback (lines 70-78) extracts key/value numbers but never stores the values. It's effectively dead code when `cbor2` is not installed.
- **Why it is a problem:** If `cbor2` is missing, `_parse_cose_key` would fall through to raise `ValueError` at line 97 regardless of the fallback loop.

### Issue 2 — RP_ID and RP_NAME Are Hardcoded

- **Lines:** 15-16
- **Severity:** Medium
- **Category:** Maintainability
- **Description:** `RP_ID = "zenova.local"` and `RP_NAME = "Zenova School"` are hardcoded. These must match the deployment domain for WebAuthn to work. On production with a different domain, WebAuthn will fail.
- **Why it is a problem:** WebAuthn requires the RP ID to match the origin. This will break in production deployments.
- **Potential Impact:** Passwordless login doesn't work on production.

### Issue 3 — `verify_assertion` RSA Verification Tries ECDSA First

- **Lines:** 192-197
- **Severity:** Low
- **Category:** Performance
- **Description:** For RSA keys, the code first tries `ec.ECDSA` which will always fail, then tries PKCS1v15. The exception is caught and re-tried. This is wasteful.

### Issue 4 — No Credential Counter Management

- **Lines:** 140-141
- **Severity:** Low
- **Category:** Security
- **Description:** The authenticator counter is read from auth data but not verified against stored values. Counter verification prevents cloned authenticator detection.
- **Potential Impact:** Cloned security keys cannot be detected.

## Security Review

- Challenge verification prevents replay — good.
- Origin verification prevents phishing — good.
- RP ID hash verification prevents domain mismatch — good.
- Missing counter verification weakens cloned-device detection.

## Performance Review

- ECC signature verification is fast.
- RSA verification with spurious ECDSA attempt is wasteful.

## Maintainability

- Well-structured with clear WebAuthn spec compliance.
- COSE key parsing is complex but necessary.

## Architecture Review

- WebAuthn implementation covers registration (attestation) and login (assertion).
- The implementation appears spec-compliant for FIDO2/WebAuthn Level 1.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 6/10 |
| Readability | 6/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 5/10 |
