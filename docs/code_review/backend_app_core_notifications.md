# File Reviewed

`backend/app/core/notifications.py` (101 lines)

## Overview

Notification service for payment confirmations and platform invoices via email (SMTP) and SMS. Supports payment confirmation and platform invoice notifications.

## Issues

### Issue 1 — SMS Implementation Is a No-Op (Stub)

- **Lines:** 99-101
- **Severity:** High
- **Category:** Functionality
- **Description:** `_send_sms` only logs the message — it never actually sends an SMS.
- **Why it is a problem:** Parents relying on SMS payment confirmations will never receive them. The code claims to send SMS but doesn't.
- **Potential Impact:** Users expecting SMS notifications won't get them, leading to support calls. Payment confirmation flow is incomplete.
- **Recommended Fix:** Implement Africa's Talking or equivalent SMS provider integration, or document that SMS is not yet active.

### Issue 2 — SMTP Connection Opens Synchronously Inside Request Handler

- **Lines:** 82-93
- **Severity:** Medium
- **Category:** Performance
- **Description:** `_send_email` opens an SMTP connection synchronously. If called from an async endpoint, it blocks the event loop.
- **Why it is a problem:** Email takes 1-3 seconds to send. During that time, the async event loop is blocked, preventing other requests from being processed.
- **Potential Impact:** Under load, blocking the event loop for email causes cascading latency.
- **Recommended Fix:** Run email sending in a thread executor (`asyncio.to_thread`) or use a background task queue.

### Issue 3 — Email From Address Hardcoded Fallback

- **Line:** 88
- **Severity:** Low
- **Category:** Configuration
- **Description:** If `settings.email_from_address` is empty, it falls back to a hardcoded `noreply@zenova.com`.
- **Why it is a problem:** In production, emails will appear to come from a hardcoded domain that may not be configured for SPF/DKIM, causing deliverability issues.
- **Potential Impact:** Emails may land in spam folders.
- **Recommended Fix:** Validate email configuration at startup and warn if `email_from_address` is not set.

### Issue 4 — No TLS/STARTTLS for SMTP

- **Lines:** 90
- **Severity:** Medium
- **Category:** Security
- **Description:** `smtplib.SMTP()` connects without TLS. Even if the port is 587 (STARTTLS), no `starttls()` call is made.
- **Why it is a problem:** Email credentials and content are sent in plaintext over the network.
- **Potential Impact:** Credential theft and email content interception.
- **Recommended Fix:** Call `server.starttls()` after connecting, or use `smtplib.SMTP_SSL()` for port 465.

### Issue 5 — `send_payment_confirmation` Has `db` as Optional but Every Caller Passes It

- **Line:** 21
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `db` is optional, but making it optional suggests the function can work without it (it falls back to `"Student"` and `"ZENOVA"` as default names).
- **Why it is a problem:** The function will send generic emails if db is not provided, which is unlikely to be intentional in any real scenario.
- **Potential Impact:** Confusion about whether db is required. Callers might skip it.
- **Recommended Fix:** Make `db` required.

### Issue 6 — Email Body Formatting Uses String Concatenation

- **Lines:** 36-39
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Uses multi-line string concatenation for email bodies.
- **Why it is a problem:** Hard to maintain, especially as templates grow.
- **Potential Impact:** Formatting errors as templates become complex.
- **Recommended Fix:** Use Jinja2 templates or Python format strings with named placeholders.

## Security Review

- **Strong points:** SMTP credentials are stored in settings (env file), not hardcoded.
- **Weak points:** No STARTTLS — credentials sent in plaintext. SMS provider not implemented (functionality gap, not security).
- **Verdict:** The SMTP security gap (no TLS) is the main concern.

## Performance Review

- Synchronous SMTP will block async event loop — needs `asyncio.to_thread()` or background queue.
- SMS is currently a no-op, so no performance impact.

## Maintainability

- Clean function signatures and separation of concerns.
- Well-named functions with type hints.
- Template formatting could be extracted for maintainability.

## Architecture Review

- Direct SMTP in request handler is not scalable. Should use a task queue (Celery, RQ, or FastAPI BackgroundTasks).
- SMS stub should be clearly documented as incomplete rather than logged as sent.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 6/10 |
| Performance | 5/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
