# File Reviewed

`backend/app/services/parent_service.py` (186 lines)

## Overview

Parent management service — CRUD for parents, smart search across multiple fields (phone, national ID, passport, name), and parent-student linking/unlinking.

## Issues

### Issue 1 — `smart_search_parents` Can Return Cross-School Results

- **Lines:** 43-60
- **Severity:** Medium
- **Category:** Security
- **Description:** If `school_id` is not provided, search returns parents from all schools.
- **Why it is a problem:** Super-admin search is intentional, but the API endpoint calling this must remember to pass school_id.
- **Potential Impact:** Tenant isolation leakage.

### Issue 2 — `update_parent` Accepts Arbitrary Dict Keys

- **Lines:** 82-84
- **Severity:** Low
- **Category:** Security
- **Description:** Same pattern as other services — any dict key matching a model attribute is set.

### Issue 3 — `link_parent_to_student` Adds Without Validating Student/Parent Belong to Same School

- **Lines:** 91-130
- **Severity:** Medium
- **Category:** Validation
- **Description:** Links a parent to a student without verifying they belong to the same school.
- **Why it is a problem:** Cross-school linking possible.
- **Potential Impact:** A parent could be linked to a student in a different school.

## Security Review

- Soft delete pattern (no data loss).
- School_id optional on many functions.

## Performance Review

- Simple CRUD — no concerns.

## Maintainability

- Clean and well-organized.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
