# File Reviewed

`backend/app/models/teacher_profile.py` (22 lines)

## Model

- `TeacherProfile` — `user_id` (unique), `teacher_id` (unique), `qualification`, `department`, `employment_date`.
- Has `user = relationship("User")`.

## Issues

### Issue 1 — Duplicated Structure with `StaffProfile`

- **Lines:** 8-22
- **Severity:** Note
- **Category:** Architecture
- **Description:** Nearly identical to `StaffProfile` (same columns, same pattern). Could share a base or be unified.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
