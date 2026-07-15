# File Reviewed

`backend/app/services/qr_service.py` (126 lines)

## Overview

QR code service — generates encrypted tokens (AES-GCM via HKDF-derived key), decrypts them, validates QR codes, and manages QR lifecycle. Uses AES-GCM authenticated encryption.

## Issues

### Issue 1 — Legacy Base64 Fallback Decryption (Insecure)

- **Lines:** 50-54
- **Severity:** High
- **Category:** Security
- **Description:** `_decrypt_token` has a fallback that tries base64-decode + JSON-parse if AES-GCM decryption fails. This means old-style plaintext tokens are still accepted.
- **Why it is a problem:** If the AES-GCM key is rotated, old tokens are still valid via the insecure fallback. Also, an attacker could create a plaintext base64 token that bypasses encryption entirely.
- **Potential Impact:** Token forgery — an attacker could craft a base64 token with any reference_type/reference_id and gain unauthorized access.
- **Recommended Fix:** Remove the legacy fallback after a migration period. All tokens should use AES-GCM.

### Issue 2 — AES-GCM Nonce Is Random (12 Bytes) — No Replay Protection

- **Line:** 34
- **Severity:** Medium
- **Category:** Security
- **Description:** AES-GCM nonce is randomly generated. There's no mechanism to detect token replay (same token scanned multiple times).
- **Why it is a problem:** A QR code screenshot could be reused by an attacker to gain repeated access.
- **Potential Impact:** Replay attack — QR code can be scanned multiple times.
- **Recommended Fix:** Include a counter or one-time-use flag. Mark tokens as used after first scan.

### Issue 3 — QR Token Contains `nonce` Field in Plaintext Payload but Nonce Is Separate

- **Lines:** 29
- **Severity:** Low
- **Category:** Code Quality
- **Description:** The payload includes a `nonce` field, but AES-GCM's nonce is separate (in the ciphertext prefix). The `nonce` field in the payload is redundant.
- **Why it is a problem:** Confusing — two different nonces exist: one in the encrypted payload (unused), one in the ciphertext (used for decryption).

### Issue 4 — HKDF Derivation Uses `settings.secret_key` as IKM

- **Lines:** 15-22
- **Severity:** Low
- **Category:** Security
- **Description:** QR encryption key is derived from `settings.secret_key` using HKDF with a fixed salt (`None`).
- **Why it is a problem:** If the secret key is compromised, all QR tokens can be decrypted. Fixed salt means the same key is always derived.
- **Potential Impact:** Mass decryption of QR tokens on key compromise.
- **Recommended Fix:** Use a random salt stored alongside each token.

## Security Review

- **Strong points:** AES-GCM authenticated encryption (integrity + confidentiality), HKDF key derivation, versioned token format (`A1|` prefix), UUID-based lookup prevents enumeration.
- **Weak points:** Insecure legacy fallback allows token forgery, no replay protection, no TTL-based single-use enforcement.
- **Verdict:** Good encryption design weakened by the legacy fallback and lack of replay protection.

## Performance Review

- AES-GCM encryption/decryption is fast — no concerns.

## Maintainability

- Clean, well-structured service.
- Versioned token format (`A1|`) enables future key rotation.

## Architecture Review

- QR service correctly encrypts tokens rather than storing raw IDs.
- The legacy fallback should be removed after a migration window.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
