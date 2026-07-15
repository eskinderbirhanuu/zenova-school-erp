# File Reviewed

`backend/app/models/student_document.py` (18 lines)

## Model

- `StudentDocument` — `student_id` (FK with CASCADE delete), `filename`, `file_url`, `file_type`, `uploaded_by`.

## Issues

### Issue 1 — CASCADE Delete on `student_id`

- **Lines:** 11
- **Severity:** Good
- **Category:** Data Integrity
- **Description:** `ondelete="CASCADE"` ensures documents are cleaned up when a student is deleted.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
