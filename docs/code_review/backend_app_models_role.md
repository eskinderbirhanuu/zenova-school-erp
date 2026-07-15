# File Reviewed

`backend/app/models/role.py` (21 lines)

## Overview

Role model — defines user roles (SUPER_ADMIN, ADMIN, DIRECTOR, TEACHER, etc.) for RBAC.

## Issues

### Issue 1 — Role Name Is Not Enum-Controlled or Unique

- **Lines:** 13
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `name` is `String(100)` with no unique constraint or enum.
- **Why it is a problem:** Two roles could be created with the same name (e.g., "ADMIN" and "ADMIN"). The permissions system maps string names to permission lists, so duplicate names break authorization.
- **Potential Impact:** Permission checks fail silently because the wrong role is matched.
- **Recommended Fix:** Add `unique=True` to `name` and consider using an enum.

### Issue 2 — `level` Field Purpose Is Unclear

- **Line:** 14
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `level = Column(String(10))` has no documentation, comment, or enumeration of valid values.
- **Why it is a problem:** No one knows what "level" means (hierarchical level? access level? privilege level?).
- **Potential Impact:** The field may be unused or misused across the codebase.
- **Recommended Fix:** Document the field's purpose or remove it if unused.

## Security Review

- Role-based permissions are defined in the Permission class (permissions.py) — the model serves as the data store for role assignments.
- FK to school for multi-tenant role separation — good.

## Performance Review

- Index on `name` and `school_id` for fast role lookup.

## Maintainability

- Very short, clean model.

## Architecture Review

- Role model correctly separates role definition from permission mapping (permissions.py).
- The role name should be unique to prevent authorization confusion.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 7/10 |
| Performance | 10/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
