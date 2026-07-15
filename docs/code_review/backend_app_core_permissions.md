# File Reviewed

`backend/app/core/permissions.py` (160 lines)

## Overview

Role-based access control (RBAC) permission system. Defines `Permission` constants (dot-notation), maps roles to permission lists, and provides `has_permission()` and `require_permission()` dependency factory.

## Issues

### Issue 1 — `is_superuser` Bypasses All Permission Checks

- **Lines:** 112-113
- **Severity:** Medium
- **Category:** Security
- **Description:** `has_permission()` returns `True` immediately if `user.is_superuser`, without checking if the permission actually exists.
- **Why it is a problem:** This is intentional (superusers have all permissions), but it means that if a developer accidentally mistypes a permission string, it will only fail for non-superuser roles.
- **Potential Impact:** Permission string typos can go undetected until non-superusers report access issues.
- **Recommended Fix:** Validate permission strings against a canonical set during testing, or log warnings for unknown permissions even when superuser bypasses the check.

### Issue 2 — `_ROLE_PERMISSION_VALUES` Uses `vars(Permission)` Introspection

- **Lines:** 52-55
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `_ROLE_PERMISSION_VALUES` dynamically extracts all string values containing `.` from the `Permission` class.
- **Why it is a problem:** This is fragile — any string constant with a `.` in the Permission class will be included, and if a new permission is accidentally defined as a literal string instead of a class attribute, it could be missed.
- **Potential Impact:** Missing permissions for SUPER_ADMIN if they are not defined as class constants.
- **Recommended Fix:** Maintain an explicit list of all permission strings or use an enum-based pattern for compile-time safety.

### Issue 3 — `require_permission` Returns the Entire User on Success

- **Lines:** 121-137
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `require_permission` uses a nested `_check` function that returns `current_user` when authorization passes. The outer `Depends(_check)` makes this return value available for parameter injection.
- **Why it is a problem:** This creates a subtle dependency injection pattern: `require_permission(...)` is called at module load time (returns `Depends`), and the return value of the inner function (the user object) can be injected into the endpoint. This works but is non-obvious.
- **Potential Impact:** Developers may not realize `require_permission(...)` also injects the `current_user` parameter, leading to duplicate `get_current_user` dependencies.
- **Recommended Fix:** Split into two separate functions: `require_permission(...)` as a guard (returns `Depends`), and `get_current_user` as a separate dependency for user injection.

### Issue 4 — `require_server_role` Doesn't Check User Authentication

- **Lines:** 143-160
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `require_server_role` does not depend on `get_current_user`, so it can be called without an authenticated user.
- **Why it is a problem:** The server role check is meant to restrict features to specific deployments (e.g., install-only), but doesn't verify the user is authenticated first.
- **Potential Impact:** An unauthenticated user hitting a server-role-gated endpoint would get a 403 instead of a 401, potentially leaking that the server is uninitialized.
- **Recommended Fix:** Add `current_user: User = Depends(get_current_user)` as a dependency to ensure authentication runs first.

### Issue 5 — No Granular Permission Hierarchy or Inheritance

- **Lines:** 57-108
- **Severity:** Low
- **Category:** Architecture
- **Description:** Each role has an explicit flat list of permissions. There is no permission inheritance (e.g., ADMIN should automatically include all REGISTRAR permissions).
- **Why it is a problem:** As the system grows, maintaining explicit lists for every role becomes error-prone. Adding a new permission requires updating every role list.
- **Potential Impact:** Role definitions drift over time; some roles may miss permissions they should logically have.
- **Recommended Fix:** Implement a role hierarchy (e.g., ADMIN inherits from REGISTRAR and FINANCE) or use a bitmask/role-level system.

### Issue 6 — `Permission` Class vs `RolePermission` Alias

- **Line:** 49
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `RolePermission = Permission` is kept as a backward-compat alias but never documented as deprecated.
- **Why it is a problem:** Dead code that persists without a deprecation timeline. Developers may use either name inconsistently.
- **Potential Impact:** Code inconsistency across the project.
- **Recommended Fix:** Add a deprecation warning or remove the alias.

## Security Review

- **Strong points:** Fine-grained permission strings (dot-notation), role-based mapping, `require_permission` factory for endpoint protection, view-only restriction for external network access.
- **Weak points:** Superuser bypass masks permission errors, no audit log for permission-denied events, flat role lists without inheritance.
- **Verdict:** Solid RBAC implementation for current needs, but will need a more scalable permission model as the product grows.

## Performance Review

- `ROLE_PERMISSIONS` is a dict of lists — O(1) lookup.
- `_ROLE_PERMISSION_VALUES` computed once at module level.
- No performance concerns.

## Maintainability

- Well-organized permission constants with doc/category comments.
- Explicit role-to-permission mapping is readable.
- Flat role lists will become maintenance-heavy as roles grow.

## Architecture Review

- Clean separation of permission definitions from enforcement.
- `require_permission` as a dependency factory is the correct FastAPI pattern.
- Missing authentication dependency in `require_server_role` is an architectural gap.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
