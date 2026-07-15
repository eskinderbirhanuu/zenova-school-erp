# File Reviewed

`backend/app/models/assignment.py` (22 lines)

## Model

- `Assignment` — title, description, `subject_name` (denormalized), `due_date`, `status`, FKs to school/class/section/subject, soft-delete.

## Issues

### Issue 1 — `subject_name` Is Denormalized

- **Lines:** 17
- **Severity:** Low
- **Category:** Architecture
- **Description:** `subject_name` is stored alongside `subject_id`. Redundant unless needed for query performance.

### Issue 2 — `description` Uses `Column(String)` Without Length

- **Lines:** 16
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `String` without a length defaults to VARCHAR(255) in most databases. For a description field, this could be too short.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
