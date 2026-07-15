# File Reviewed

`backend/app/api/v1/endpoints/students.py` (464 lines)

## Overview

Full student management — CRUD, transfer, promote, QR generation, NFC assignment, bulk import (JSON + Excel), Excel export, transcript with batch-loaded semester/exam data, and document upload/delete.

## Issues

### Issue 1 — Student Document Upload Saves to Local Filesystem

- **Lines:** 411-419
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `uploads/students/{student_id}` directory with direct file write. Not scalable — should use object storage (S3, MinIO). Also, `os.makedirs` will fail if `uploads/students/` doesn't exist.

### Issue 2 — Document Delete Doesn't Verify Ownership

- **Lines:** 442-463
- **Severity:** Low
- **Category:** Security
- **Description:** `delete_student_document` verifies the student exists in the school, but the document deletion doesn't verify the document belongs to the student's school.

### Issue 3 — Transcript Batch-Load Architecture Is Good

- **Lines:** 265-315
- **Severity:** Good
- **Category:** Performance
- **Description:** Batch-loads class grades, exams grouped by semester, results grouped by exam, and subjects. Avoids N+1 queries.

### Issue 4 — Bulk Import JSON Creates Students Without Transaction

- **Lines:** 176-195
- **Severity:** Low
- **Category:** Reliability
- **Description:** No explicit transaction wrapping. If one student fails, partial import may occur.

### Issue 5 — Excel Import/Export Tenant Scoping Correct

- **Lines:** 207-215, 224-225
- **Severity:** Good
- **Category:** Security
- **Description:** School_id is forced to caller's school for non-superusers.

### Issue 6 — Document Upload Does Not Validate File Type or Size

- **Lines:** 411-419
- **Severity:** Medium
- **Category:** Security
- **Description:** Any file is accepted and saved. No MIME type validation, no file size limit, no virus scanning.

## Security Review

- Permission checks on CRUD (STUDENT_CREATE, STUDENT_EDIT, STUDENT_DELETE).
- Document upload lacks type/size validation (Issue 6).
- Tenant scoping throughout.

## Performance Review

- Transcript uses batch loading.
- Excel export limited to 5000 rows.

## Maintainability

- Large file but well-organized.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 6/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
