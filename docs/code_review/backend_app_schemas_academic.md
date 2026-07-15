# File Reviewed

`backend/app/schemas/academic.py` (237 lines)

## Schemas

- AcademicYear, Semester, ClassGrade, Section, Subject, Classroom, TimetableEntry, ExamType, Exam, ExamResult, Promotion — each with Create/Update/Response variants.
- Bulk schemas: `BulkExamResultCreate`, `BulkPromotionCreate`.

## Issues

### Issue 1 — Comprehensive Academic Schema Coverage

- **Lines:** 6-237
- **Severity:** Good
- **Category:** Architecture
- **Description:** Full CRUD schemas for all academic domain entities. Bulk operations included.

### Issue 2 — Missing `school_id` on Some Create Schemas

- **Lines:** 45-48, 82-87, 104-107
- **Severity:** Note
- **Category:** Architecture
- **Description:** Schemas like `ClassGradeCreate`, `SubjectCreate`, `ClassroomCreate` don't include `school_id` — presumably set server-side from auth context.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
