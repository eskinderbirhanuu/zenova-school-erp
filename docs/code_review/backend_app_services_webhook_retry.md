# File Reviewed

`backend/app/services/webhook_retry.py` (70 lines)

## Overview

Webhook retry service — manages failed payment webhook retries with exponential backoff (1min, 5min, 15min, max 3 retries) and dead-letter queue for permanently failed webhooks.

## Issues

### Issue 1 — `enqueue_failed_webhook` Uses `getattr` for `webhook_retry_count`

- **Lines:** 27
- **Severity:** Low
- **Category:** Reliability
- **Description:** `getattr(session, "webhook_retry_count", 0)` — if the column doesn't exist on the model, this silently defaults to 0.
- **Why it is:** If the column exists, this is fine.

### Issue 2 — `process_retry_queue` Handles All Gateways as Chapa

- **Lines:** 47-48
- **Severity:** Medium
- **Category:** Design
- **Description:** Hardcoded `get_gateway("chapa", ...)`. If other payment gateways are added, they won't be retried.

### Issue 3 — Retry Processing Uses `process_chapa_payment` With Minimal Data

- **Lines:** 50-54
- **Severity:** High
- **Category:** Reliability
- **Description:** The retry constructs a minimal dict with only `tx_ref` and `reference`. The original webhook payload is not passed. `process_chapa_payment` expects the full Chapa response for HMAC validation (line 247-248 in parent_payment_service.py). This retry will fail HMAC validation because the constructed dict doesn't match the real Chapa signature.
- **Why it is a problem:** All retries fail due to HMAC validation.
- **Potential Impact:** Webhook retry is completely broken.

## Security Review

- Clean separation — no concerns.

## Performance Review

- Simple batch processing.

## Maintainability

- Clean and focused.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 5/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 4/10 |
