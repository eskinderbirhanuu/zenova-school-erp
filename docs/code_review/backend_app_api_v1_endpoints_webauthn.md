# File Reviewed

`backend/app/api/v1/endpoints/webauthn.py` (234 lines)

## Overview

WebAuthn (passkey) authentication — registration challenge/verify, authentication challenge/verify (with token issuance), credential listing/deletion. In-memory challenge store.

## Issues

### Issue 1 — In-Memory Challenge Store Is Not Multi-Process Safe

- **Lines:** 72
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `_CHALLENGES: dict[str, str]` is an in-memory dict. With multiple workers/processes, challenges created by one process won't be found by another. Also, `next(iter(_CHALLENGES), None)` on line 105 pops arbitrary challenge, not the one matching the user.

### Issue 2 — `webauthn_register_verify` Pops Arbitrary Challenge Instead of Matching

- **Lines:** 105
- **Severity:** High
- **Category:** Bug
- **Description:** `_CHALLENGES.pop(next(iter(_CHALLENGES), None), "")` pops the first (random) challenge, NOT the challenge associated with the current user's registration. With concurrent users, this WILL cause cross-user authentication failures and security issues.

### Issue 3 — Same Bug in `webauthn_auth_verify`

- **Lines:** 162
- **Severity:** High
- **Category:** Bug
- **Description:** Same arbitrary-challenge-pop pattern. Will fail with concurrent users.

### Issue 4 — `webauthn_register_challenge` Generates Two Challenges But Returns One

- **Lines:** 80-82
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Two `generate_challenge()` calls — one for the challenge, one for the nonce key. The nonce is never returned or used by the client.

### Issue 5 — `webauthn_auth_verify` Returns Tokens for Any Active User

- **Lines:** 176-183
- **Severity:** Note
- **Category:** Security
- **Description:** If assertion verification succeeds, tokens are issued. No MFA boundary check.

### Issue 6 — Uses `__import__("datetime")` Instead of Normal Import

- **Lines:** 185
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `__import__("datetime").datetime.now(__import__("datetime").timezone.utc)` — awkward pattern. Should use `from datetime import datetime, timezone`.

## Security Review

- WebAuthn protocol implemented with challenge-response.
- In-memory challenge store has race conditions (Issue 2, 3).
- Tokens issued after authentication.

## Performance Review

- Lightweight — cryptographic operations only.

## Maintainability

- Inline Pydantic models for request/response.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 5/10 |
| Security | 4/10 |
| Performance | 7/10 |
| Readability | 6/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 4/10 |
