# File Reviewed

`backend/app/models/timetable.py` (20 lines)

## Model

- `TimetableEntry` — `day_of_week` (Integer), `start_time`/`end_time` (Time), `subject_id`, `teacher_id`, `section_id`, `classroom_id`.

## Issues

### Issue 1 — No Time Slot Conflict Prevention

- **Lines:** 12-14
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** No constraints prevent overlapping timetable entries for the same teacher, section, or classroom.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
