# File Reviewed

`backend/app/models/notification_preference.py` (19 lines)

## Model

- `NotificationPreference` — per-user (unique), `email_on`, `telegram_on`, `sms_on` toggles, `telegram_chat_id`.

## Issues

### Issue 1 — `user_id` Unique Constraint

- **Lines:** 12
- **Severity:** Good
- **Category:** Architecture
- **Description:** One preference record per user.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
