# File Reviewed

`backend/app/services/email_service.py` (58 lines)

## Overview

Email sending service — sends plain text and HTML emails via SMTP with STARTTLS. Provides a pre-built `send_absence_notification_email` for parent notifications.

## Issues

### Issue 1 — `send_email` Returns False on Any Error

- **Lines:** 32-33
- **Severity:** Medium
- **Category:** Error Handling
- **Description:** `except Exception: return False` swallows all errors. Callers can't distinguish between "SMTP unavailable", "authentication failed", "invalid email address".
- **Why it is a problem:** Callers don't know why email failed.
- **Potential Impact:** Silent email delivery failures.
- **Recommended Fix:** Log the exception and return specific error information.

### Issue 2 — No Retry Logic

- **Lines:** 25-31
- **Severity:** Medium
- **Category:** Reliability
- **Description:** Email sending fails immediately on first attempt. No retry for transient SMTP errors.
- **Why it is a problem:** Temporary SMTP issues cause permanent email failures.
- **Potential Impact:** Parents miss important notifications.

### Issue 3 — SMTP Password Hardcoded in Config

- **Lines:** 28-29
- **Severity:** Note
- **Category:** Security
- **Description:** SMTP credentials are stored in settings. This is standard practice but should be in secrets management.
- **Why it is a note:** Standard for most applications.

### Issue 4 — No Email Queue/Background Processing

- **Lines:** 25-31
- **Severity:** Medium
- **Category:** Performance
- **Description:** Email is sent synchronously in the request thread. A slow SMTP server blocks the HTTP response.
- **Why it is a problem:** API latency increases during SMTP timeouts.
- **Recommended Fix:** Use a background task queue for email sending.

## Security Review

- STARTTLS for transport encryption — good.
- No email address validation.

## Performance Review

- Synchronous SMTP blocks the request thread.

## Maintainability

- Clean and simple.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 5/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 5/10 |
