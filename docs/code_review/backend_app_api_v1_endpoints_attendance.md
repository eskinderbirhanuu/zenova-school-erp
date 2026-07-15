# File Reviewed

`backend/app/api/v1/endpoints/attendance.py` (232 lines)

## Overview

Attendance endpoints — bulk mark attendance with tenant validation and absence notifications, query attendance with filters, update attendance records, and export to Excel.

## Issues

### Issue 1 — Hardcoded Ethiopian Attendance Window (08:00-10:00 UTC+3)

- **Lines:** 23-26, 44-48, 164-168
- **Severity:** Medium
- **Category:** Maintainability
- **Description:** Attendance window (08:00-10:00 Ethiopian time) is hardcoded. Not configurable via settings.
- **Potential Impact:** Schools with different attendance schedules cannot use the feature without code changes.

### Issue 2 — Time Window Based on Server Time, Not School Local Time

- **Lines:** 18-26
- **Severity:** Medium
- **Category:** Functionality
- **Description:** The Ethiopian time calculation assumes the server clock is UTC. If the server is in a different timezone, the window calculation is wrong.
- **Why it is:** The hardcoded `ETHIOPIA_UTC_OFFSET = timedelta(hours=3)` works only for UTC-based servers.

### Issue 3 — `notify_parents_of_absence` Called for Every Absent Student Individually

- **Lines:** 95-102
- **Severity:** Low
- **Category:** Performance
- **Description:** Inside a loop over absent students, each call to `notify_parents_of_absence` triggers its own DB queries.
- **Potential Impact:** Slow bulk attendance marking with many absences.

### Issue 4 — `patch_attendance` Sends Notification on Any Status Update When `was_absent`

- **Lines:** 186-194
- **Severity:** Low
- **Category:** Logic
- **Description:** Notification is sent after the update if `was_absent` is true — but `was_absent` is set from `att.status` BEFORE the update data is applied (line 186 vs lines 177-184). So if status was "absent" and is changed to "present", the parent is still notified.
- **Why it is:** The notification is about the existing absence record, which is correct behavior.

## Security Review

- Tenant validation via batch-loaded student IDs (lines 56-64) prevents cross-tenant attendance marking — excellent design.
- School_id scoping on all queries.

## Performance Review

- Batch student ID pre-loading avoids N+1 — good.
- Export uses batch-load for student names — good.

## Maintainability

- Clean endpoints with clear responsibility separation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
