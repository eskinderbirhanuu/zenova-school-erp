# Multi-Role Access Control (MRBAC) Architecture

## Overview

ZENOVA MRBAC enables unlimited roles per user, permission-based access control,
dynamic dashboard widgets, and role switching — comparable to SAP, Microsoft Dynamics 365,
and Odoo Enterprise.

## Design Principles

1. **Non-Breaking** — all existing single-role users continue working
2. **Union of Permissions** — user's effective permissions = UNION of all assigned roles
3. **Permission IDs, Not Role Names** — all checks use string permission keys
4. **Audited** — every role assignment/revocation is logged
5. **Feature-Gated** — optional modules never break core

---

## Database Schema

### New Tables

#### `user_roles` (association table)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Primary key |
| `user_id` | FK → users | The user |
| `role_id` | FK → roles | The role |
| `assigned_by` | FK → users | Who assigned this role |
| `assigned_at` | DateTime | When assigned |
| `revoked_at` | DateTime | When revoked (null = active) |
| `reason` | String(500) | Why assigned/revoked |
| `deleted_at` | DateTime | Soft delete |

Unique constraint: `(user_id, role_id)`

#### `role_permissions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Primary key |
| `role_id` | FK → roles | The role |
| `permission_key` | String(100) | e.g. `students.view` |
| `is_granted` | Boolean | True = grant, False = deny |
| `deleted_at` | DateTime | Soft delete |

Unique constraint: `(role_id, permission_key)`

### Changes to `users` table

- `role_id` column preserved (backward compat, becomes "primary role")
- New `user_roles` relationship (many-to-many via association table)
- `User.roles` property returns active role objects
- `User.get_role_names()` returns list of role name strings
- `User.get_permissions()` returns set of permission strings

### Changes to `roles` table

- New `user_assignments` relationship (backref from `user_roles`)
- New `permission_assignments` relationship (backref from `role_permissions`)

---

## Permission Engine

### Permission Keys

All permissions are dot-notation strings defined in `Permission` class
(`backend/app/core/permissions.py`):

```
students.create
students.edit
students.delete
students.view
parents.create
parents.edit
finance.journal.create
finance.reports.view
hr.manage
inventory.manage
library.manage
cafeteria.pos
attendance.mark
audit.view
settings.manage
licenses.manage
schools.manage
grades.enter
card.print
card.assign
card.reprint
corporate.employee.view
corporate.employee.create
corporate.employee.edit
corporate.department.view
corporate.department.manage
corporate.finance.view
corporate.settings.manage
infrastructure.view
```

### Resolution Order

```
User
  → get_role_names() → ["DIRECTOR", "TEACHER"]
    → for each role_name:
        → check role_permissions DB table (if seeded)
        → fallback to ROLE_PERMISSIONS dict
    → UNION of all permissions
```

### Key Functions

```python
def get_user_permissions(user: User) -> set[str]:
    """Union of all permissions from all roles."""

def has_permission(user: User, permission: str) -> bool:
    """Check if user has a specific permission."""

def has_any_role(user: User, *role_names: str) -> bool:
    """Check if user has any of the given roles."""

def has_all_roles(user: User, *role_names: str) -> bool:
    """Check if user has all of the given roles."""

def get_role_permissions(role_name: str) -> list[str]:
    """Get permissions for a single role (DB first, then dict fallback)."""
```

---

## Auth Layer

### JWT Claims

```json
{
  "sub": "user-uuid",
  "role": "DIRECTOR",          // Primary role (backward compat)
  "type": "access",
  "jti": "..."
}
```

Note: The JWT keeps a single `role` claim. All roles are communicated
via the `user_roles` cookie and the `/auth/me` endpoint response.

### Cookies

| Cookie | Value | Purpose |
|--------|-------|---------|
| `user_role` | `"DIRECTOR"` | Primary role (backward compat) |
| `user_roles` | `"DIRECTOR,TEACHER"` | All roles (comma-separated) |

### `/auth/me` Response

```json
{
  "id": "...",
  "email": "...",
  "role_name": "DIRECTOR",
  "roles": ["DIRECTOR", "TEACHER"],
  "permissions": ["students.view", "attendance.mark", "grades.enter", ...],
  ...
}
```

### `AuthContext` (FastAPI dependency)

Extended with:

```python
@property
def roles(self) -> list[str]:           # All role names
@property
def permissions(self) -> list[str]:     # All permission keys
def has_any_permission(self, *): bool    # Any of these?
def has_all_permissions(self, *): bool   # All of these?
```

---

## Role Assignment API

### `POST /api/v1/users/{user_id}/roles?role_id={id}&reason=...`

Assign a role to a user. Creates `user_roles` record + audit log.

### `DELETE /api/v1/users/{user_id}/roles/{role_id}?reason=...`

Revoke a role. Soft-deletes the `user_roles` record + audit log.

### `GET /api/v1/users/{user_id}/roles`

List all active roles for a user.

### `GET /api/v1/users/{user_id}/permissions`

Get effective permissions (union of all roles).

### `GET /api/v1/roles`

List all available roles with their permissions.

### `GET /api/v1/roles/{role_id}/permissions`

Get a specific role's permissions.

### `POST /api/v1/auth/switch-role?role_name=TEACHER`

Switch active role (frontend helper — returns filtered permissions).

---

## Frontend Architecture

### `useAuth()` hook (extended)

```typescript
const {
  user,             // User object with roles[], permissions[]
  activeRole,       // Currently active role for view
  setActiveRole,    // Switch active role
  hasPermission,    // Check permission
  hasAnyPermission, // Check any of
  hasRole,          // Check if user has a role
} = useAuth()
```

### Middleware (`middleware.ts`)

- Reads `user_roles` cookie (comma-separated)
- If missing, falls back to `user_role` cookie
- Route access: `canAccessRoute(roles, pathname)` — ANY role can access
- Root redirect: `getBestDashboard(roles)` — highest priority dashboard

### Role Priority

Defined in `ROLE_PRIORITY` array — when user has multiple roles, the
highest-priority dashboard is shown on login.

### Sidebar

- Menu items gated by `permission` (not role name)
- `RoleSwitcher` dropdown appears when user has >1 role
- Displays `ROLE_LABELS` for human-friendly names

### Role Switcher Component

`frontend/src/components/auth/role-switcher.tsx`

- Shows all user roles
- Highlights active role
- On switch: updates active role → navigates to role's dashboard
- Only visible when user has 2+ roles

### Dynamic Dashboard Widgets

`frontend/src/components/dashboard/dashboard-widgets.tsx`

- Widgets filtered by `hasPermission()`
- Sorted by priority
- Rendered in responsive grid
- Example widgets: Student Stats, Attendance, Finance, Library, etc.

### Role Guard

`frontend/src/components/auth/role-guard.tsx`

- Uses `hasRole()` (checks against ALL roles, not just active)
- Redirects to best dashboard if no allowed role matches

---

## Migration Path

### Existing Users

The migration (`a0b1c2d3e4f5`) automatically:

1. Creates `user_roles` table
2. Creates `role_permissions` table
3. Copies existing `User.role_id` → `user_roles` entry
4. Seeds `role_permissions` from `ROLE_PERMISSIONS` dict

All existing users continue to work. Their `role_id` FK remains set
as the "primary role."

### Backward Compatibility

- `User.role` (singular relationship) still works
- `get_user_role_name()` returns primary role
- `user_role` cookie still set for legacy middleware
- `require_permission()` unchanged — still works with permission strings
- `ROLE_PERMISSIONS` dict still valid as fallback

---

## Testing

### Single-Role User

- Login → one role in `user_roles` cookie
- Menu shows only permitted items
- RoleSwitcher not visible

### Dual-Role User

- Login → both roles in `user_roles` cookie
- RoleSwitcher visible in sidebar
- Switching role navigates to correct dashboard
- Menu shows union of both roles' permissions

### Permission Conflicts

- Deny rules not yet implemented (future)
- Currently: permission present in ANY role → GRANTED

### API Authorization

- `require_permission("students.view")` works with multi-role
- `has_permission()` checks union of all roles
- JWT auth flow unchanged

---

## Future Expansion

### Deny Overrides

Add `is_granted=False` support in `role_permissions` — deny takes priority.

### Custom Role Creation

Admin UI for creating custom roles with arbitrary permission combinations.

### Per-Module Enable/Disable

Each module registers its permissions. Feature flags gate module visibility.

### Permission Inheritance

Role hierarchy: Director inherits Teacher permissions (configurable).

### Audit Dashboard

UI for viewing role assignment history with filters.

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/models/user_role.py` | `UserRole` model (association table) |
| `backend/app/models/role_permission.py` | `RolePermission` model |
| `backend/app/core/permissions.py` | Permission constants, engine, multi-role functions |
| `backend/app/core/auth_deps.py` | `AuthContext` with multi-role support |
| `backend/app/services/auth_service.py` | `get_user_role_names()`, `get_user_permissions_list()` |
| `backend/app/api/v1/endpoints/roles.py` | Role assignment CRUD API |
| `backend/app/schemas/auth.py` | `UserResponse` with `roles`/`permissions` fields |
| `backend/alembic/versions/a0b1c2d3e4f5_add_multi_role_tables.py` | DB migration |
| `frontend/src/config/roles.ts` | Role config, `getBestDashboard()`, `canAccessRoute()` |
| `frontend/src/services/auth-context.tsx` | Multi-role auth context |
| `frontend/src/middleware.ts` | Multi-role middleware |
| `frontend/src/components/auth/role-switcher.tsx` | Role switcher UI |
| `frontend/src/components/auth/role-guard.tsx` | Multi-role guard |
| `frontend/src/components/layout/sidebar.tsx` | Permission-based sidebar |
| `frontend/src/components/dashboard/dashboard-widgets.tsx` | Dynamic widget grid |
