# File Reviewed

`backend/app/services/telegram_bot_service.py` (146 lines)

## Overview

Telegram bot service — connect (set webhook), disconnect, get status, handle incoming webhooks (start/link commands), and send messages. Links Telegram chat IDs to student accounts via `/link` command.

## Issues

### Issue 1 — `/link` Command Sends Password in Plain Text via Telegram

- **Lines:** 100-134
- **Severity:** High
- **Category:** Security
- **Description:** The `/link <student_id> <password>` command sends student credentials via Telegram, an unencrypted (in transit between Telegram servers and bot) channel. The password is visible in Telegram's servers and potentially in chat history.
- **Why it is a problem:** Student credentials exposed to Telegram and anyone with access to the chat history.
- **Potential Impact:** Student accounts compromised.
- **Recommended Fix:** Use a one-time code/link flow instead of sending passwords via Telegram.

### Issue 2 — `handle_webhook` Creates a New DB Session for Auth

- **Lines:** 110-114
- **Severity:** Low
- **Category:** Resource Management
- **Description:** Opens a new `SessionLocal()` inside a function that already receives a `db: Session`. Two DB sessions in the same request context.

### Issue 3 — Bot Token Stored in Plain Text in DB

- **Lines:** 26-50
- **Severity:** Medium
- **Category:** Security
- **Description:** `SchoolTelegramBot.bot_token` is stored as-is in the database. If the DB is compromised, all bot tokens are exposed.

### Issue 4 — No Rate Limiting on Webhook

- **Lines:** 76-139
- **Severity:** Low
- **Category:** Security
- **Description:** The webhook endpoint could be spammed with messages.

## Security Review

- **Critical:** Password transmission via Telegram.
- Bot token in plaintext in DB.

## Performance Review

- Async HTTP calls with httpx — appropriate.

## Maintainability

- Clean async service with good separation.
- Webhook handling is well-structured.

## Architecture Review

- School-scoped bot configuration is well-designed.
- The `/link` command auth flow needs redesign.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 3/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 4/10 |
