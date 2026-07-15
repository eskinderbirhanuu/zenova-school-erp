# File Reviewed

`backend/app/models/teacher_section_assignment.py` (19 lines)

## Model

- `TeacherSectionAssignment` — `teacher_id`, `section_id` with `UniqueConstraint("teacher_id", "section_id")`.

## Issues

### Issue 1 — Clean Unique Constraint

- **Lines:** 17-19
- **Severity:** Good
- **Category:** Architecture
- **Description:** Prevents duplicate section assignments.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
