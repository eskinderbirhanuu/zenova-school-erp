# File Reviewed

`backend/app/models/leave.py` (47 lines)

## Models

- `LeaveType` — name, `default_days`, `is_paid`, `school_id`.
- `LeaveRequest` — `staff_profile_id`, `leave_type_id`, `start_date`/`end_date`, `days`, `reason`, `status`, `approved_by`.
- `LeaveBalance` — `staff_profile_id`, `leave_type_id`, `year`, `total_days`, `used_days`, `remaining_days`.

## Issues

### Issue 1 — `remaining_days` Is Redundant

- **Lines:** 46
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `remaining_days = total_days - used_days` could be computed. Risk of data inconsistency if not updated together.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
