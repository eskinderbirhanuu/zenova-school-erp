# File Reviewed

`backend/app/services/chapa_service.py` (123 lines)

## Overview

Chapa payment gateway integration — per-school API key support via `PaymentGatewayConfig`. Implements payment initialization, transaction verification (server-side), and webhook signature verification (HMAC-SHA256).

## Issues

### Issue 1 — Webhook Signature Uses SHA-256, Not Chapa's Standard

- **Line:** 120
- **Severity:** High
- **Category:** Security
- **Description:** The webhook signature verification uses `hmac.sha256(secret_key, payload)`. Chapa's webhook signing standard may differ (they may use a different HMAC construction or include nonce/timestamp in the signature payload).
- **Why it is a problem:** If the HMAC construction doesn't match Chapa's actual implementation, all webhook signature verifications will either always pass or always fail. If always pass, fake webhooks are accepted. If always fail, legitimate payment callbacks are rejected.
- **Potential Impact:** Fake payment callbacks could mark unpaid invoices as paid (financial fraud). Or genuine payments fail to process.
- **Recommended Fix:** Verify the exact HMAC construction expected by Chapa. Read their API documentation for the correct signing algorithm.

### Issue 2 — No Transaction Reference Validation in Callback URL

- **Lines:** 45-87
- **Severity:** Medium
- **Category:** Security
- **Description:** The `callback_url` is passed to Chapa but there's no validation that the callback URL points back to the same deployment that initiated the payment.
- **Why it is a problem:** If the `callback_url` is manipulated or if there's a mismatch, the payment flow could be interrupted or hijacked.
- **Potential Impact:** Payment flow disruption. Man-in-the-middle could redirect callbacks.

### Issue 3 — `_get_school_chapa_keys` Returns `_DEFAULT_PUBLIC_KEY` Even When Public Key Is Unset

- **Line:** 34
- **Severity:** Low
- **Category:** Configuration
- **Description:** If a school config has no public key, the global default is returned. The school may be using a different public key than expected.
- **Why it is a problem:** The public key is used on the frontend for payment widget initialization. Mismatch would cause initialization failures.

### Issue 4 — `ChapaError` Is a Generic Exception Without Error Codes

- **Lines:** 20-21, 86-87, 107-108
- **Severity:** Low
- **Category:** Error Handling
- **Description:** All Chapa errors raise `ChapaError` with a string message. Callers can't distinguish between "network error", "invalid API key", "insufficient balance", etc.
- **Potential Impact:** Error handling in callers is limited to generic "payment failed" messages.
- **Recommended Fix:** Add error codes or subclass ChapaError with specific types (AuthError, NetworkError, ApiError).

### Issue 5 — No Idempotency Key on Transaction Initialization

- **Lines:** 45-87
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `initialize_payment` doesn't send an idempotency key to Chapa. If the request times out client-side but succeeds server-side, retrying creates duplicate payment sessions.
- **Potential Impact:** Duplicate payment attempts if network issues occur during initialization.
- **Recommended Fix:** Pass `tx_ref` (which is unique) as Chapa's idempotency key.

## Security Review

- **Strong points:** Per-school API keys, HMAC webhook verification, server-side transaction verification (not trusting callbacks alone).
- **Weak points:** Webhook HMAC algorithm may not match Chapa's standard, no callback URL validation.
- **Verdict:** Good security structure but the webhook signature implementation needs verification against Chapa's documentation.

## Performance Review

- Uses `httpx` for async-compatible HTTP calls — good.
- 30-second timeouts are reasonable for payment gateways.

## Maintainability

- Clean separation from the rest of the payment flow.
- Docstring in the `_get_school_chapa_keys` function documents its behavior.

## Architecture Review

- Gateway-specific logic is correctly separated from `payment_gateway.py` abstraction.
- Per-school API key support enables multi-tenant payment processing.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 6/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
