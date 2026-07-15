# File Reviewed

`backend/app/models/recruitment.py` (18 lines)

## Model

- `JobPosting` — `school_id`, `position`, `department`, `applicants_count` (counter), `status`.

## Issues

### Issue 1 — `applicants_count` Is a Denormalized Counter

- **Lines:** 14
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** Counter can drift from actual applicant records. Should use COUNT query instead.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
