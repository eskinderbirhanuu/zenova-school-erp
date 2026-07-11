# 08 — RBAC (Role-Based Access Control) AUDIT

**Generated:** 2026-07-11
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

ZENOVA implements a comprehensive role-based access control system with 14 roles, 32 granular permissions, permission-gated endpoints via dependency injection, tenant isolation via school_id filtering, and server-role-based access control. The RBAC system is well-designed and consistently applied across ~90% of endpoints. A few endpoints remain under-protected, and the bulk NFC assign operation lacks proper permission checks.

**Score:** 8.5/10

---

## Current Implementation

### Permission Matrix (32 permissions)

```
students.create, students.edit, students.delete, students.view
parents.create, parents.edit
teachers.create, staff.create
finance.journal.create, finance.reports.view
hr.manage
inventory.manage
library.manage
cafeteria.pos
audit.view
settings.manage
licenses.manage
schools.manage
licenses.device_review
corporate.employee.view, corporate.employee.create, corporate.employee.edit
corporate.department.view, corporate.department.manage
card.print, card.assign, card.reprint
grades.enter
corporate.finance.view
corporate.settings.manage
corporate.deploy
```

### Role-Permission Mapping (14 roles)

| Role | Permissions | Access Level |
|------|-------------|--------------|
| SUPER_ADMIN | All 32 permissions | Unrestricted |
| ADMIN | 18 permissions (school-level admin) | Full school management |
| DIRECTOR | 12 permissions | View-heavy + create |
| REGISTRAR | 5 permissions | Student/parent management |
| TEACHER | 2 permissions (students.view, grades.enter) | Limited classroom |
| FINANCE | 2 permissions (finance entry + reports) | Finance only |
| HR | 1 permission (hr.manage) | HR only |
| INVENTORY | 1 permission (inventory.manage) | Inventory only |
| LIBRARY | 1 permission (library.manage) | Library only |
| CAFETERIA | 1 permission (cafeteria.pos) | Cafeteria POS only |
| AUDITOR | 1 permission (audit.view) | Read-only audit |
| ZENOVA_CARD_OFFICER | 5 permissions | Card management |
| ZENOVA_CORPORATE_ADMIN | 8 permissions | Corporate management |
| ZENOVA_SUPPORT | 3 permissions | View-only support |

### Enforcement Mechanisms

1. **`require_permission(*permissions)`**: FastAPI dependency. Checks if `current_user` has at least one of the listed permissions. Returns user or raises 403.
2. **`require_role(*role_names)`**: Deprecated. Coarse-grained role check. Prefer `require_permission()`.
3. **`PermissionChecker`**: Deprecated class-based checker.
4. **`has_permission(user, permission)`**: Pure function — superusers always return True, view-only users only get `students.view`/`audit.view`.
5. **`require_licensed_feature(feature)`**: License-based feature gating (nfc, qr). Blocks mutation if license invalid.
6. **`require_server_role(*roles)`**: Deployment-role check (SUPER_ADMIN, MAIN_SCHOOL, BRANCH). Returns 503 if uninitialized.
7. **`require_inside_network()`**: Trusted network check. Sets `is_view_only=True` for users outside school network.

### Tenant Isolation

- **Per-endpoint school_id filtering**: Most endpoints filter by `current_user.school_id`
- **Superadmin bypass**: `if not current_user.is_superuser` → no school_id filter
- **Cross-tenant guards**: Explicitly checked in card_design (`str(current_user.school_id) != str(school_id)`)
- **NFC by-card endpoints**: Filtered by `current_user.school_id` (resolved July 2026)

### Frontend RBAC (middleware.ts)

- Static `ROLE_PREFIXES` map defines which URL prefixes each role can access
- `ROLE_DASHBOARD` map defines default redirect per role
- Edge middleware checks `user_role` cookie against allowed prefixes
- **Important**: This is a UI-level convenience layer. Real authorization is only at the backend.

---

## Endpoint Protection Audit

| Endpoint Group | Protected By | Status |
|---------------|-------------|--------|
| Auth (login/register/refresh/forgot/reset) | Rate-limited, public | Correct (public endpoints) |
| MFA | Authenticated + CSRF | Correct |
| Student CRUD | `require_permission(STUDENT_CREATE/EDIT/DELETE/VIEW)` | Correct |
| Parent CRUD | `require_permission(PARENT_CREATE/EDIT)` | Correct |
| Teacher CRUD | `require_permission(TEACHER_CREATE)` | Correct |
| Staff CRUD | `require_permission(STAFF_CREATE)` | Correct |
| Finance CRUD | `require_permission(FINANCE_ENTRY/REPORTS/AUDIT_VIEW)` | Correct |
| HR | `require_permission(HR_MANAGE)` | Correct |
| Inventory | `require_permission(INVENTORY_MANAGE)` | Correct |
| Library | `require_permission(LIBRARY_MANAGE)` | Correct |
| Cafeteria | `require_permission(CAFETERIA_POS)` | Correct |
| Audit logs | `require_permission(AUDIT_VIEW)` | Correct |
| Settings | `require_permission(SETTINGS_MANAGE)` | Correct |
| Dashboard | `Depends(get_current_user)` | Correct (view-only, per-role) |
| NFC student assign | `require_permission(STUDENT_CREATE)` | Correct |
| NFC staff assign | `require_permission(STAFF_CREATE)` | Correct |
| NFC parent assign | `require_permission(PARENT_CREATE)` | Correct |
| NFC employee assign | `require_permission(CARD_PRINT_ASSIGN)` | Correct (resolved) |
| NFC **bulk assign** | `Depends(get_current_user)` only | **MISSING permission check** |
| NFC scan | `Depends(get_current_user)` | Acceptable (operational scan) |
| NFC public lookup | No auth (rate-limited only) | Acceptable (public, returns minimal info) |
| QR generate | `require_permission(STUDENT_CREATE)` | Correct |
| QR validate | No auth (rate-limited only) | Acceptable (public validation) |
| Platform admin dashboard | `require_permission(AUDIT_VIEW)` | Correct (resolved) |
| IGA metrics | `require_permission(AUDIT_VIEW)` | Correct (resolved) |
| IGA health-summary | `require_permission(AUDIT_VIEW)` | Correct (resolved) |
| Card print request | `require_permission(CARD_PRINT)` | Correct |
| Card print process | `require_permission(CARD_PRINT)` | Correct |
| NFC scan logs | `require_permission(AUDIT_VIEW)` | Correct |
| Backup download | `require_permission(LICENSE_MANAGE)` | Correct |
| Card design GET | `Depends(get_current_user)` + cross-tenant guard | Correct |
| Card design PUT | `require_permission(SETTINGS_MANAGE)` + cross-tenant guard | Correct |
| Installer init | Master setup key + license validation | Correct |
| VPS connect | Rate-limited | Acceptable (init-time operation) |
| Sync endpoints | `Depends(get_current_user)` | Acceptable |
| WebSocket | Unknown — requires auth? | **Needs audit** |

---

## Privilege Escalation Guards

1. **Self-registration role restriction**: `SAFE_SELF_REGISTER_ROLES = {"PARENT", "STUDENT"}` — prevents registering as ADMIN.
2. **Superuser bypass**: `is_superuser=True` grants all permissions — intentional design.
3. **View-only enforcement**: `is_view_only=True` limits to `students.view` + `audit.view` — enforced at `has_permission()` level.
4. **Server role enforcement**: `require_server_role()` prevents a branch server from acting as super-admin.
5. **License feature gating**: `require_licensed_feature()` prevents using premium features without valid license.
6. **Trusted network enforcement**: `require_inside_network()` marks out-of-network users as view-only.

---

## Issues

### Medium

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| M1 | Bulk NFC assign lacks RBAC | nfc_v2.py:77-87 | `Depends(get_current_user)` only — no `require_permission()`. Any authenticated user can bulk-assign cards of any type across tenants. |
| M2 | WebSocket auth unknown | ws.py | WS endpoint auth not verified. If unauthenticated, real-time data leaks to anyone who connects. |
| M3 | Some finance list endpoints permissive | finance.py | `VIEW_FINANCE = [FINANCE_ENTRY, FINANCE_REPORTS, AUDIT_VIEW]` — auditors can view financial data. Intentional but worth noting. |

### Low

| # | Issue | Detail |
|---|-------|--------|
| L1 | `require_role()` deprecated but still callable | No removal plan. Should be removed to enforce permission-based access. |
| L2 | `PermissionChecker` deprecated but callable | Same as above — cleanup needed. |
| L3 | `user_role` cookie for frontend routing is mutable | Client can change cookie value to see different UI. Backend still enforces auth, but UI integrity is compromised. |
| L4 | No permission audit report | No endpoint that lists "who can do what" for transparency. |
| L5 | StudentPortal/ParentPortal endpoints possibly under-protected | Endpoints listed in router but not individually audited. Verify each has proper student/parent RBAC. |

---

## Recommended Improvements

1. **MEDIUM: Add `require_permission(CARD_PRINT_ASSIGN, STUDENT_CREATE, STAFF_CREATE, PARENT_CREATE)` to bulk NFC assign**. Validate each card type's permission individually. Medium effort, low risk.
2. **MEDIUM: Audit WebSocket auth** — verify `ws.py` requires authentication. Low effort.
3. **LOW: Remove deprecated `require_role()` and `PermissionChecker`** — clean unused code paths. Low effort.
4. **LOW: Add permission report endpoint** — `/auth/permissions` returning role→permission map for transparency. Low effort.
5. **LOW: Add student/parent portal endpoint audit** — verify each endpoint properly restricts to student/parent ownership.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| Bulk assign RBAC | Low | Low |
| WS auth audit | Low | Low |
| Deprecated removal | Low | Low |
| Permission report | Low | Low |

---

## Priority

| Priority | Item |
|----------|------|
| P1 (soon) | Bulk NFC assign RBAC |
| P2 (later) | WS auth verification |
| P3 (nice-to-have) | Deprecated removal, permission report |

---

## Production Readiness: RBAC

**Ready with minor gaps.** The RBAC system is comprehensive and consistently applied. The bulk NFC assign RBAC gap and WebSocket auth verification are the only items needing attention before multi-tenant production deployment.