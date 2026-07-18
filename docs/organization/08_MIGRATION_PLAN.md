# Migration Plan

## Executive Summary

This document outlines the incremental migration from ZENOVA's current
organization model to the target Enterprise Organization Architecture.

**Guiding Principles:**
1. Never break existing installations
2. Every step is backward-compatible
3. Schools can migrate at their own pace
4. No data loss at any stage
5. Each phase is independently deployable

---

## Migration Phases

### Phase 0: Current State (Today)

```
✓ roles table
✓ user_roles join table  
✓ role_permissions table
✓ Multi-role permission engine
✓ user_roles cookie for frontend
✓ Role switcher UI component
✓ Permission-based sidebar
✓ Dynamic dashboard widget system
```

**Services that are running:**
- All existing auth flows
- All existing APIs (JWT, cookies, permissions)
- All 15 role-specific dashboard pages
- All role-specific route groups and layouts

**What does NOT exist yet:**
- `departments` table
- `head_offices` / `head_office_schools` tables
- `modules` / `school_modules` tables
- Permission scoping (own/dept/campus/school)
- Module registry
- Single adaptive dashboard
- Organization Builder UI

---

### Phase 1: Departments Foundation

**Goal:** Create department infrastructure without breaking anything.

**Database Migration:**

```sql
CREATE TABLE departments (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL REFERENCES schools(id),
    campus_id VARCHAR(36) REFERENCES branches(id),
    parent_dept_id VARCHAR(36) REFERENCES departments(id),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    head_user_id VARCHAR(36) REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(school_id, code)
);

ALTER TABLE users ADD COLUMN department_id VARCHAR(36) REFERENCES departments(id);
CREATE INDEX idx_users_department_id ON users(department_id);

ALTER TABLE branches ADD COLUMN parent_branch_id VARCHAR(36) REFERENCES branches(id);
```

**Data Migration:**

```python
# For existing teacher_profiles and staff_profiles with department strings:
# 1. Collect all unique department strings per school
# 2. Create department records for each
# 3. Update user.department_id based on their profile's department string
# 4. The free-text department column remains for backward compatibility
```

**API Endpoints (new):**
```
GET    /api/v1/departments              — list departments
POST   /api/v1/departments              — create department
GET    /api/v1/departments/tree          — department tree
PATCH  /api/v1/departments/{id}         — update department
DELETE /api/v1/departments/{id}         — soft-delete department
POST   /api/v1/departments/{id}/assign  — assign users to department
```

**Impact:** None. Existing free-text `department` fields continue to work.
New department system is additive.

**Regression Tests:**
- Existing teacher creation still works (department remains optional)
- Existing staff creation still works
- User list still works
- All permission checks unchanged

**Rollback:** Drop `departments` table, remove `department_id` column.
Free-text strings reappear as the only source of department info.

---

### Phase 2: Permission Scoping

**Goal:** Add scope support to `role_permissions` without changing the
permission check API.

**Database Migration:**

```sql
ALTER TABLE role_permissions ADD COLUMN scope VARCHAR(20) DEFAULT 'school';
ALTER TABLE role_permissions ADD COLUMN scope_id VARCHAR(36) DEFAULT NULL;
```

**Engine Update:**

```python
# has_permission() already takes a permission string.
# We add scope matching:

def has_permission(user, permission_key, scope=None, scope_id=None):
    """Check if user has a permission at the given scope."""
    for role in user.roles:
        for rp in role.permission_assignments:
            if rp.permission_key == permission_key:
                if scope and rp.scope == "department":
                    # Check user's department matches
                    if user.department_id == rp.scope_id:
                        continue  # this assignment doesn't match
                return rp.is_granted
    return False
```

**Backward Compatibility:**

The old `has_permission(user, "students.create")` call automatically maps
to `has_permission(user, "students.create", scope="school")`. No existing
code breaks.

**Impact:** None. All existing `has_permission()` calls continue to work.
The `scope` and `scope_id` parameters are optional and default to `school`.

---

### Phase 3: Module Registry

**Goal:** Make modules self-describing with their permissions and widgets.

**Database Migration:**

```sql
CREATE TABLE modules (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_core BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE school_modules (
    id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL REFERENCES schools(id),
    module_code VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'enabled'
        CHECK (status IN ('enabled', 'disabled', 'coming_soon', 'beta')),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(school_id, module_code)
);
```

**Seed Data:**

```sql
INSERT INTO modules (id, code, name, is_core) VALUES
    (gen_random_uuid(), 'core', 'Core System', TRUE),
    (gen_random_uuid(), 'students', 'Students', TRUE),
    (gen_random_uuid(), 'academic', 'Academic', TRUE),
    (gen_random_uuid(), 'finance', 'Finance', FALSE),
    (gen_random_uuid(), 'attendance', 'Attendance', FALSE),
    (gen_random_uuid(), 'hr', 'Human Resources', FALSE),
    (gen_random_uuid(), 'inventory', 'Inventory', FALSE),
    (gen_random_uuid(), 'library', 'Library', FALSE),
    (gen_random_uuid(), 'cafeteria', 'Cafeteria', FALSE),
    (gen_random_uuid(), 'communication', 'Communication', FALSE),
    (gen_random_uuid(), 'reports', 'Reports', FALSE),
    (gen_random_uuid(), 'settings', 'Settings', TRUE),
    (gen_random_uuid(), 'audit', 'Audit', TRUE);
```

**Impact:** For existing schools, all modules are seeded as `enabled`.
No change in behavior. New schools can selectively disable modules.

---

### Phase 4: Head Office (Optional)

**Goal:** Add Head Office support for school groups without affecting
independent schools.

**Database Migration:**

```sql
CREATE TABLE head_offices (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE head_office_schools (
    id VARCHAR(36) PRIMARY KEY,
    head_office_id VARCHAR(36) NOT NULL REFERENCES head_offices(id),
    school_id VARCHAR(36) UNIQUE NOT NULL REFERENCES schools(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP
);

ALTER TABLE users ADD COLUMN head_office_id VARCHAR(36) REFERENCES head_offices(id);
```

**Feature Flag:** `FEATURE_HEAD_OFFICE=false` (disabled by default).

**Impact:** Zero for existing installations. Head Office routes return 404
when the feature is disabled. Existing Super Admin→School Director flow
is unchanged.

---

### Phase 5: Adaptive Dashboard Consolidation

**Goal:** Replace 15 dashboard pages with one adaptive dashboard.

**Step 1 — Add the unified dashboard route:**
```
app/dashboard/page.tsx  ← single dashboard (permission-based widgets)
```

**Step 2 — Migrate each role-group layout to redirect to `/dashboard`:**
```tsx
// Example: (admin)/admin/dashboard/page.tsx → redirect
export default function AdminDashboardPage() {
  redirect("/dashboard")
}
```

**Step 3 — When ALL roles have been redirected, remove the redirect pages**
and keep only `/dashboard`.

**Impact on Multi-Role Users:**

A user with roles [Director, Teacher] visiting `/dashboard`:
- Sees union of Director and Teacher widgets
- Can filter via Role Switcher to see only one role's widgets
- Never hits a "404 role dashboard not found" error

**Backward Compatibility:**

Old URLs like `/admin/dashboard` still work (they redirect to `/dashboard`).
Bookmarks are preserved.

---

### Phase 6: Organization Builder UI

**Goal:** Visual interface for managing departments, roles, permissions.

**Frontend Components:**

```
components/organization/
├── org-builder.tsx          ← Main builder layout
├── department-tree.tsx      ← Interactive department tree
├── role-manager.tsx         ← Role CRUD panel
├── permission-matrix.tsx    ← Module × Action × Scope grid
├── user-assignments.tsx     ← Assign users to roles/departments
└── module-toggles.tsx       ← Enable/disable modules
```

**Routes:**
```
/settings/organization       ← Org Builder main page
/settings/organization/departments
/settings/organization/roles
/settings/organization/permissions
/settings/organization/modules
```

**Permission Required:** `settings.manage` (existing permission — no change)

---

## Rollback Plan

Each phase has a rollback procedure:

| Phase | Rollback |
|-------|----------|
| 1 (Departments) | Drop `departments` table, remove `department_id` column. Free-text fields return. |
| 2 (Scoping) | Drop `scope` / `scope_id` columns from `role_permissions`. Engine falls back to no-scope mode. |
| 3 (Modules) | Drop `school_modules` and `modules` tables. All modules are implicitly enabled. |
| 4 (Head Office) | Drop tables. Disable feature flag. Super Admin → School Director flow restored. |
| 5 (Dashboard) | Revert the redirect. Individual dashboard pages become active again. |
| 6 (Org Builder) | Remove frontend components. No database impact. |

**Gold rule:** No phase touches existing working code paths. Every phase is
additive until Phase 5, which is a redirect-based migration.

---

## Recommended Order

```
Month 1:  Phase 1 — Departments Foundation
Month 2:  Phase 2 — Permission Scoping
Month 3:  Phase 3 — Module Registry
Month 4:  Phase 4 — Head Office (if needed)
Month 5:  Phase 5 — Adaptive Dashboard
Month 6:  Phase 6 — Organization Builder UI
```

Each phase is independently testable and independently deployable.

---

## Migration Checklist

### For Existing Schools

```
[ ] Phase 1 migration runs (creates departments table, adds column)
[ ] Existing free-text departments become `departments` records
[ ] Users optionally assigned to departments
[ ] All existing permission checks continue to pass
[ ] All existing API endpoints return correct data
[ ] Frontend rendering unchanged
[ ] 457 existing tests pass
```

### For New Schools After Migration

```
[ ] Departments table seeded (if needed)
[ ] Module registry populated
[ ] Default roles created with scoped permissions
[ ] Organization Builder available in Settings
[ ] Adaptive dashboard enabled by default
```

---

## Summary

| Phase | What Changes | Breaking? | Rollback |
|-------|-------------|-----------|----------|
| 1 | Departments table, user FK | No | Drop table, column |
| 2 | Permission scope columns | No | Drop columns |
| 3 | Modules tables | No | Drop tables |
| 4 | Head Office tables | No (behind flag) | Drop tables |
| 5 | Dashboard redirect | No (old URLs redirect) | Revert redirect |
| 6 | Org Builder UI | No | Remove components |

**Total breaking changes across all phases: ZERO**
