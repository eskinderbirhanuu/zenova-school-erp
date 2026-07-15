# File Reviewed

`backend/app/models/payment_gateway_config.py` (20 lines)

## Model

- `PaymentGatewayConfig` — per-school payment gateway settings: `gateway` (e.g. "chapa"), `secret_key`, `public_key`, `webhook_secret`, `is_active`, `config_json`.

## Issues

### Issue 1 — Secrets Stored in Plaintext

- **Lines:** 13-15
- **Severity:** Medium
- **Category:** Security
- **Description:** `secret_key`, `public_key`, `webhook_secret` are stored as plaintext strings. Should be encrypted at rest.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 5/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
