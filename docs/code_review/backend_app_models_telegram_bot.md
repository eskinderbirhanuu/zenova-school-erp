# File Reviewed

`backend/app/models/telegram_bot.py` (20 lines)

## Model

- `SchoolTelegramBot` — per-school (unique `school_id`), `bot_token` (Text), `bot_username`, `bot_name`, `logo_url`, `webhook_url`, `is_active`.

## Issues

### Issue 1 — `bot_token` Stored in Plaintext

- **Lines:** 12
- **Severity:** Medium
- **Category:** Security
- **Description:** Telegram bot token stored as plaintext in the database. Should be encrypted at rest.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 5/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
