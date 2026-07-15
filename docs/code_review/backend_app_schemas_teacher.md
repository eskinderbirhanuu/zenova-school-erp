# File Reviewed

`backend/app/schemas/teacher.py` (61 lines)

## Schemas

- `TeacherCreate/Response/Update`, `TeacherListResult`, `AssignGradeRequest`, `AssignSectionRequest`.

## Issues

### Issue 1 — Password in Create Schema

- **Lines:** 17
- **Severity:** Note
- **Category:** Security
- **Description:** Optional password field with `min_length=8` — standard for auto-generated credentials.

### Issue 2 — Regex Gender Validation

- **Lines:** 9
- **Severity:** Good
- **Category:** Security
- **Description:** `pattern="^(male|female)$"` constrains input.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
