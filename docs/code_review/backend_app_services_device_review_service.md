# File Reviewed

`backend/app/services/device_review_service.py` (298 lines)

## Overview

Device change review service — handles hardware mismatch detection, auto-approval for small changes, escalation for major/full changes, admin notification, approval/rejection workflow, expiry auto-approval, and 30-day archiving.

## Issues

### Issue 1 — Auto-Approval in `create_device_change_request` Bypasses Review

- **Lines:** 35-36
- **Severity:** Low
- **Category:** Functionality
- **Description:** If `changed_count <= 2`, the request is `auto_approved` without any notification to admins. This is acceptable for minor changes.
- **Why it is a note:** This is a design choice, not a bug.

### Issue 2 — `DEVICE_CHANGE_ESCALATION` Dictionary Is Unused

- **Lines:** 14-17
- **Severity:** Low
- **Category:** Dead Code
- **Description:** The `DEVICE_CHANGE_ESCALATION` dictionary at the top is never referenced anywhere in the file. Thresholds are hardcoded inline (≤2, ≤5, otherwise) instead.
- **Why it is a problem:** Confusing — a developer may update the dict thinking it's in effect.

### Issue 3 — TPM Seal Failure Silently Ignored on Approve

- **Lines:** 170-174, 256-259
- **Severity:** Medium
- **Category:** Error Handling
- **Description:** `except Exception: pass` on TPM seal during approval and auto-approve. The license is activated but TPM data is not sealed.
- **Why it is a problem:** TPM-bound licenses lose hardware attestation capability after approval.

### Issue 4 — `auto_approve_expired_requests` Re-Fingerprints on Current Machine

- **Lines:** 232-271
- **Severity:** High
- **Category:** Logic
- **Description:** When auto-approving, the server calls `get_machine_fingerprint()` to set the license's `machine_fingerprint` and `hardware_id`. This rebinds the license to the **server's** current hardware, not the school server's hardware that was requesting the change.
- **Why it is a problem:** The license is rebound to the auto-approval server's hardware, which is completely wrong. The requesting school's hardware should be captured.
- **Potential Impact:** License invalidated for the real school server. The school can't use the software after auto-approval.
- **Recommended Fix:** Store the requesting machine's fingerprint in the change request and use that during approval.

### Issue 5 — `archive_old_device_changes` Deletes Without Confirmation

- **Lines:** 274-298
- **Severity:** Low
- **Category:** Operations
- **Description:** Records older than 30 days are soft-deleted automatically. No confirmation or log sent to admins.

## Security Review

- Admin notification for device changes — good.
- Status state machine prevents double-review.
- Auto-approval on expiry is a good fail-safe for unattended servers.

## Performance Review

- Simple queries — no concerns.

## Maintainability

- Well-structured with clear workflow.
- Dead code (`DEVICE_CHANGE_ESCALATION` dict) should be removed.

## Architecture Review

- Device change workflow is well-designed.
- The auto-approve rebinding to wrong hardware is a critical bug.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
