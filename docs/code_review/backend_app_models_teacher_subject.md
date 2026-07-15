# File Reviewed

`backend/app/models/teacher_subject.py` (19 lines)

## Model

- `TeacherSubject` — `teacher_profile_id`, `subject_id`, `school_id`. `UniqueConstraint("teacher_profile_id", "subject_id")`.

## Issues

### Issue 1 — Clean Unique Constraint

- **Lines:** 17-19
- **Severity:** Good
- **Category:** Architecture
- **Description:** Prevents duplicate subject assignments for the same teacher.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
