# File Reviewed

`backend/app/services/registration_service.py` (136 lines)

## Overview

Student registration orchestrator — coordinates student creation, parent linking (smart search or create), and QR code generation in one atomic-like workflow using a `RegistrationResult` object.

## Issues

### Issue 1 — No Transaction Around Full Registration

- **Lines:** 15-87
- **Severity:** High
- **Category:** Reliability
- **Description:** The registration flow calls `student_service.create_student`, `_handle_parent`, and `qr_service.generate_qr` without a wrapping DB transaction. If QR generation fails after student is committed, there's an orphan student with no QR.
- **Why it is a problem:** Partial registration leaves inconsistent state.
- **Potential Impact:** Student enrolled without QR code.
- **Recommended Fix:** Wrap entire registration in a single DB transaction with explicit commit at the end.

### Issue 2 — `_handle_parent` Smart Search May Return Wrong Parent

- **Lines:** 97-109
- **Severity:** Medium
- **Category:** Logic
- **Description:** Smart search uses `phone_1`, `phone_2`, or `national_id` as query. If the search returns multiple results, it takes `existing[0]` — the first match. If a parent of the same name exists with a different phone, the wrong parent is linked.
- **Why it is a problem:** Student linked to wrong parent.
- **Potential Impact:** Parent receives notifications for wrong child.

### Issue 3 — `_handle_parent` Calls `id_service.generate_id` With `school_id=None`

- **Lines:** 111
- **Severity:** Medium
- **Category:** Bug
- **Description:** If `school_id` is None, `id_service.generate_id` is called with `school_id=None`. The `generate_id` function uses `school_id` in the sequence lookup — a None school_id means the sequence is shared across all registrations without a school, which would cause collisions.
- **Why it is a problem:** Parent IDs could collide across registrations without school_id.
- **Potential Impact:** Duplicate ID generation.

## Security Review

- Audit logging is done inside individual service calls — good.
- No additional security concerns.

## Performance Review

- Multiple service calls but acceptable for registration volume.

## Maintainability

- Well-orchestrated with clear steps.
- Smart parent linking is a good UX feature.

## Architecture Review

- Registration service correctly orchestrates sub-services.
- Missing transaction wrapping is the main architectural concern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
