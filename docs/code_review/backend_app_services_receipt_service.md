# File Reviewed

`backend/app/services/receipt_service.py` (266 lines)

## Overview

Receipt generation service — creates PDF receipts using ReportLab, generates receipt numbers, manages receipt lifecycle (create, cancel, email).

## Issues

### Issue 1 — `email_receipt_pdf` Silently Returns False on Error

- **Lines:** 245-266
- **Severity:** Medium
- **Category:** Error Handling
- **Description:** `except Exception: return False` swallows all errors. Callers can't distinguish between "PDF generation failed", "email sending failed", "receipt not found".
- **Why it is a problem:** Debugging email issues is difficult. Operations team won't know why receipts aren't being delivered.
- **Potential Impact:** Parents don't receive receipts, and the school doesn't know why.
- **Recommended Fix:** Log the exception and return specific error information.

### Issue 2 — `cancel_receipt` Doesn't Create Reversal Journal Entry

- **Lines:** 225-242
- **Severity:** Medium
- **Category:** Accounting
- **Description:** Cancelling a receipt updates the receipt status but doesn't create a reversal journal entry or link to a refund record.
- **Why it is a problem:** The accounting ledger still shows the original payment as revenue. Cancelling the receipt without reversing the journal entry creates a financial discrepancy.
- **Potential Impact:** Revenue is overstated after receipt cancellation.
- **Recommended Fix:** Automatically create a reversal journal entry when a receipt is cancelled.

### Issue 3 — `email_receipt_pdf` Generates PDF Then Emails — No Attachment Sent

- **Lines:** 245-266
- **Severity:** High
- **Category:** Bug
- **Description:** `_send_email` is called with `body` text but the PDF attachment (`pdf_bytes`) is generated and then **discarded** — it's never attached to the email.
- **Why it is a problem:** Parents receive an email saying "please find attached your payment receipt" but there's no attachment.
- **Potential Impact:** Parents never receive the actual receipt PDF. Support tickets increase.
- **Recommended Fix:** Pass `pdf_bytes` as an email attachment to `_send_email`.

### Issue 4 — `create_receipt_from_payment` Doesn't Create Receipt Verification Code

- **Lines:** 29-72
- **Severity:** Low
- **Category:** Functionality
- **Description:** The receipt has no verification code or QR code for authenticity verification.
- **Why it is a problem:** Paper receipts can't be verified for authenticity.
- **Potential Impact:** Receipt fraud — a parent could forge a receipt.
- **Recommended Fix:** Generate a verification code or QR on each receipt.

## Security Review

- Receipt cancellation changes status but doesn't remove data — good.
- No cryptographic receipt verification — receipts are trust-based.

## Performance Review

- PDF generation uses ReportLab — moderate CPU/memory for each receipt. Should be moved to background task.

## Maintainability

- Well-structured with clean style definitions.
- PDF template is well-organized with clear sections.

## Architecture Review

- Receipt service correctly separates generation from persistence.
- ReportLab dependency for PDF generation is appropriate.
- Missing email attachment and journal reversal are functional gaps.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 7/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
