# File Reviewed

`backend/app/models/performance.py` (18 lines)

## Model

- `PerformanceReview` — `staff_profile_id`, `reviewer_id`, `period`, `rating` (Integer), `comments`.

## Issues

### Issue 1 — No Rating Scale Definition

- **Lines:** 15
- **Severity:** Low
- **Category:** Documentation
- **Description:** `rating` is an integer but the valid range (1-5, 1-10, etc.) is not documented or enforced at the DB level.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
