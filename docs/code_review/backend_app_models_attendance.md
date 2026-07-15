# File Reviewed

`backend/app/models/attendance.py` (21 lines)

## Overview

Attendance model — tracks student and staff check-in/check-out times with status (present, absent, late, excused).

## Issues

### Issue 1 — Polymorphic Entity Reference (staff_profile_id OR student_id)

- **Lines:** 11-12
- **Severity:** Low
- **Category:** Architecture
- **Description:** Attendance can reference either a staff_profile or a student. Only one should be non-null. No constraint enforces this.
- **Why it is a problem:** Both could be null (orphan attendance) or both could be set (which entity is this attendance for?).
- **Potential Impact:** Data integrity issues — attendance records that can't be attributed.
- **Recommended Fix:** Add a `CheckConstraint` that exactly one of `staff_profile_id` or `student_id` is non-null.

### Issue 2 — `status` Is Free-Text String

- **Line:** 16
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `status` is `String(20)` with default `"present"`. Valid values are documented in comment but not enforced: present, absent, late, excused.
- **Why it is a problem:** A typo ("abesnt") creates a new uncategorized status that reports won't capture.
- **Potential Impact:** Attendance reports will be incomplete. "Absentee rate" calculations will be wrong.
- **Recommended Fix:** Use an `AttendanceStatus` enum (PRESENT, ABSENT, LATE, EXCUSED).

### Issue 3 — No `marked_via` Field

- **Lines:** 7-21
- **Severity:** Low
- **Category:** Functionality
- **Description:** No field to record how attendance was taken (manual, NFC scan, QR scan, bulk import).
- **Why it is a problem:** Auditors can't verify attendance capture method. NFC/QR-based attendance can't be distinguished from manual entry.
- **Potential Impact:** Difficulty auditing attendance accuracy.
- **Recommended Fix:** Add a `marked_via` field (MANUAL, NFC, QR, IMPORT).

## Security Review

- FK constraints to staff, student, school, user — good referential integrity.
- No security issues.

## Performance Review

- Indexes on dates and FKs would benefit common queries (date range lookups are frequent for attendance).

## Maintainability

- Clean, minimal model.
- Comment documents valid status values — helpful.

## Architecture Review

- Polymorphic entity reference without constraint is a minor design risk.
- Status enum enforcement would improve data quality.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
