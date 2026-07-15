# File Reviewed

`backend/app/utils/uid_hash.py` (6 lines)

## Function

- `hash_card_uid(raw_uid)` — returns SHA-256 HMAC of card UID using `settings.secret_key`.

## Issues

### Issue 1 — Good Use of Secret Key for HMAC

- **Lines:** 5-6
- **Severity:** Good
- **Category:** Security
- **Description:** Card UIDs are hashed with the app secret key to prevent forgery.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
