# File Reviewed

`backend/app/models/school.py` (28 lines)

## Overview

School model — core tenant entity for the multi-school platform. Links to branches, users, and license keys.

## Issues

### Issue 1 — `owner_id` FK to Users Has No Relationship Backpopulates

- **Line:** 22
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `owner_id` has a ForeignKey to `users.id` but no `relationship()` definition or `back_populates` on the User side.
- **Why it is a problem:** SQLAlchemy won't provide automatic join loading or cascading for the owner relationship. The relationship only exists at the database constraint level.
- **Potential Impact:** Developers must manually query the user for school owner, which is error-prone.
- **Recommended Fix:** Add a `relationship("User", foreign_keys=[owner_id])` and a corresponding `owned_schools` relationship on the User model.

### Issue 2 — No `timezone` Column for School

- **Line:** 8-28
- **Severity:** Low
- **Category:** Functionality
- **Description:** School has no timezone field. All timestamps are stored in UTC.
- **Why it is a problem:** A school in Addis Ababa (UTC+3) will see schedules and reports in UTC, which is 3 hours off.
- **Potential Impact:** Confusing reporting data for end users.
- **Recommended Fix:** Add a `timezone` column (default `"Africa/Addis_Ababa"` for Ethiopian schools).

### Issue 3 — `main_license_key` Column Exists but License System May Use `license.key` Table

- **Line:** 22
- **Severity:** Low
- **Category:** Architecture
- **Description:** `main_license_key` is a direct string field on School, but `app.models.license` has a separate `License` model with its own key storage.
- **Why it is a problem:** Two storage locations for license information = potential inconsistency.
- **Potential Impact:** If the license key changes in one place but not the other, the school could appear licensed when it isn't.
- **Recommended Fix:** Remove `main_license_key` from School and rely solely on the License model.

## Security Review

- FK on `owner_id` provides referential integrity.
- No security issues found.

## Performance Review

- UUID primary key with indexes on `code` — appropriate for multi-tenant lookups.
- Simple model with no performance concerns.

## Maintainability

- Clean and minimal model definition.
- Well-named fields.

## Architecture Review

- School is the root tenant entity — correct for multi-tenant architecture.
- The relationship between School and License needs attention (dual storage).

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 9/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
