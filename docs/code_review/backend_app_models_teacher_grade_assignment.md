# File Reviewed

`backend/app/models/teacher_grade_assignment.py` (18 lines)

## Model

- `TeacherGradeAssignment` — `teacher_id`, `grade_id`, with `UniqueConstraint("teacher_id", "grade_id")`.

## Issues

### Issue 1 — Clean Many-to-Many with Unique Constraint

- **Lines:** 16-18
- **Severity:** Good
- **Category:** Architecture
- **Description:** Prevents duplicate grade assignments for the same teacher.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
