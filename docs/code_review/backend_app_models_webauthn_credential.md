# File Reviewed

`backend/app/models/webauthn_credential.py` (18 lines)

## Overview

WebAuthn (passkey) credential model — stores FIDO2/WebAuthn public keys in CBOR format for passwordless authentication.

## Issues

### Issue 1 — `sign_count` Is a String Instead of Integer

- **Line:** 14
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `sign_count` is `String(20)` default `"0"` but should be an integer. WebAuthn sign counts are monotonically increasing integers used for clone detection.
- **Why it is a problem:** String comparison for sign count will fail: `"100" < "20"` is True (lexicographic). Clone detection logic would be broken.
- **Potential Impact:** WebAuthn clone detection (replay attack prevention) would not work correctly.
- **Recommended Fix:** Change to `Integer` column, default `0`.

### Issue 2 — `credential_id` Is `String(500)` — May Be Too Short

- **Line:** 12
- **Severity:** Low
- **Category:** Compatibility
- **Description:** Credential IDs can be up to 1023 bytes per WebAuthn spec. String(500) may truncate long credential IDs.
- **Why it is a problem:** Some authenticators (e.g., roaming USB keys) produce longer credential IDs than 500 characters.
- **Potential Impact:** Some passkeys may fail to register due to truncation.
- **Recommended Fix:** Increase to `Text` or `String(1024)`.

## Security Review

- **Strong points:** Stores public key in CBOR format (not raw), tracks sign count for clone detection.
- **Weak points:** Sign count as string breaks clone detection.
- **Verdict:** Good WebAuthn model with one critical data type error that breaks clone detection.

## Performance Review

- Index on `user_id` and unique on `credential_id` — good.

## Maintainability

- Very short (18 lines), clean model.
- Good field naming.

## Architecture Review

- Correctly supports the WebAuthn specification.
- The `is_active` flag allows credential revocation without deletion.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 7/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 8/10 |
