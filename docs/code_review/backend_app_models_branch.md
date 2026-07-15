# File Reviewed

`backend/app/models/branch.py` (25 lines)

## Overview

Branch model — multi-campus support for schools. Links to school, users, and branch-specific license keys.

## Issues

### Issue 1 — `code` Indexed but Not Unique

- **Lines:** 13
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `code` is indexed but has no unique constraint. Two branches within the same school could have the same code.
- **Why it is a problem:** Branch codes are used for identification and reporting. Duplicate codes break lookups.
- **Potential Impact:** Branch-level reports might show incorrect data due to code collisions.
- **Recommended Fix:** Add a composite unique constraint on `(school_id, code)`.

### Issue 2 — `branch_license_key` Repeats the `main_license_key` Pattern from School

- **Line:** 18
- **Severity:** Low
- **Category:** Architecture
- **Description:** Branch has its own `branch_license_key` field, similar to School's `main_license_key`. License keys are stored redundantly.
- **Why it is a problem:** License key storage is split across School, Branch, and License models. Updates must be synchronized across all three.
- **Potential Impact:** Inconsistent license state if one is updated but others aren't.
- **Recommended Fix:** Consolidate all license key storage into the License model.

## Security Review

- FK to school ensures branch belongs to a school — good.
- No security issues.

## Performance Review

- Index on `code` for fast lookup.
- No performance concerns.

## Maintainability

- Clean, minimal model.
- Good separation of branch from school.

## Architecture Review

- Branch model correctly supports multi-campus architecture.
- License key duplication is a minor architectural concern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 9/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
