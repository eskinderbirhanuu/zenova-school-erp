# File Reviewed

`backend/app/api/v1/endpoints/parent_payments.py` (355 lines)

## Overview

Parent payment portal — dashboard, invoices, payment session creation, Chapa gateway integration, webhook handling, receipt listing/download, and refund workflow (request/approve/process). Background notification sending.

## Issues

### Issue 1 — Indentation Error on Line 211

- **Lines:** 210-211
- **Severity:** High
- **Category:** Bug
- **Description:** Line 211 `return [` is indented one level too deep (inside the `if` block? No, it's after the `if` block at line 209 but has extra indentation). Actually looking at lines 206-222:
```
206:     receipts = db.query(Receipt).filter(
207:         Receipt.parent_id == current_user.parent_id,
208:         Receipt.school_id == current_user.school_id,
209:     ).order_by(Receipt.created_at.desc()).all()
210: 
211:         return [
212:         {
213:             "id": r.id,
```

Line 211 is indented with 8 spaces but should be 4 spaces. This is a **syntax/logic error** — the `return` statement will be indented wrong and may cause Python parsing issues or be inside an unintended block.

### Issue 2 — Chapa Webhook Doesn't Verify Parent Ownership

- **Lines:** 154-194
- **Severity:** Medium
- **Category:** Security
- **Description:** Webhook processes a payment session without verifying that the session belongs to the current parent_id (the webhook is unauthenticated). However, the webhook is unauthenticated by design — it verifies the Chapa signature instead.

### Issue 3 — `_send_payment_notification` Creates New DB Session

- **Lines:** 338-355
- **Severity:** Low
- **Category:** Architecture
- **Description:** Background task creates its own DB session. Acceptable pattern for background tasks but separates transactional context.

### Issue 4 — Placeholder Email for Chapa Init

- **Lines:** 133
- **Severity:** Low
- **Category:** Data Quality
- **Description:** `parent.phone_1 + "@placeholder.com"` and `"parent@zenova.com"` as fallback. These are technically correct for Chapa API requirements but may cause confusion in payment records.

### Issue 5 — `approve_refund_endpoint` and `process_refund_endpoint` Use `has_permission` Inline Instead of Dependency

- **Lines:** 303-305, 324-326
- **Severity:** Low
- **Category:** Consistency
- **Description:** Uses `has_permission` inline check instead of `require_permission` dependency. Inconsistent with rest of codebase.

## Security Review

- Parent ownership verified via `current_user.parent_id`.
- Refund validates payment ownership via parent-student link.
- Webhook signature verification.
- `with_for_update()` not used in payment webhook (see finance_service review).

## Performance Review

- Background notification sent asynchronously.

## Maintainability

- Moderate length but well-organized.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 6/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 6/10 |
