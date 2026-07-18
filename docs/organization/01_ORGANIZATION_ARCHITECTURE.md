# Organization Architecture

## Executive Summary

ZENOVA's current organizational model treats schools as flat entities with
hardcoded roles and 15 separate dashboard pages. This design cannot scale
to the diversity of real schools — small, large, multi-campus, international,
or those that invent new roles years after deployment.

This document defines the target architecture: a **permission-first,
department-aware, self-adapting enterprise organization model**.

---

## Why This Change Is Needed

### Problem 1: Departments Do Not Exist

Teacher and staff `department` fields are free-text strings. There is no
`departments` table, no hierarchy, no department head, and no department-based
access control. A Math teacher and a Science teacher are indistinguishable to
the authorization system.

### Problem 2: Roles Are Hardcoded

The system ships with 15 predefined roles. Adding one — "Digital Learning
Coordinator" — requires touching backend permissions, frontend configs,
middleware, route groups, layouts, dashboards, and nav definitions.

### Problem 3: Dashboards Are Duplicated

There are 15 separate dashboard page files. All call the same backend
endpoint. Adding a role means cloning yet another dashboard page.

### Problem 4: No Head Office Concept

Large school groups have a central Head Office between Super Admin and
school Directors. The system has no model for this.

### Problem 5: No Hierarchy

Branches are flat. Departments are flat. There is no tree structure for
multi-campus schools, sub-departments, or reporting lines.

---

## Target Architecture

```
Super Admin
    │
    ├── Head Office (optional)
    │       │
    │       ├── School
    │       │   │
    │       │   ├── Campus (Branch)
    │       │   │   │
    │       │   │   ├── Department
    │       │   │   │   │
    │       │   │   │   ├── Sub-Department (optional)
    │       │   │   │   └── Role → Permissions → Modules → Widgets
    │       │   │   │
    │       │   │   └── User (belongs to department, has roles)
    │       │   │
    │       │   └── ... more campuses
    │       │
    │       └── ... more schools
    │
    └── Direct schools (when Head Office is disabled)
```

### Entity Definitions

| Entity | Description | Scope |
|--------|-------------|-------|
| **Super Admin** | Platform owner. Manages licenses, Head Offices, and global settings. | Global |
| **Head Office** | Optional governing body. Sits between Super Admin and schools. Manages multiple schools. | Tenant group |
| **School** | Independent educational institution. Owns its own license, departments, roles, users. | School |
| **Campus (Branch)** | Physical location of a school. Can have sub-campuses. | School |
| **Department** | Organizational unit (Math, Science, HR, Finance, etc.). Hierarchical — supports sub-departments. | School |
| **Role** | Named set of permissions. Configurable per school. | School / Campus / Department |
| **User** | Person with login. Belongs to a department. Has one or more roles. | School |
| **Module** | Feature group (Students, Finance, Library, etc.). Can be enabled/disabled per school. | School |
| **Widget** | Dashboard component. Appears based on user's permissions. | User |

---

## Key Design Principle: Everything Is Configurable

Nothing in the organization structure is hardcoded:

| Component | Current (Hardcoded) | Target (Configurable) |
|-----------|-------------------|----------------------|
| Departments | Free-text strings | `departments` table with CRUD UI |
| Roles | 15 predefined roles | Dynamic — create via UI |
| Role→Permissions | Dict in `permissions.py` | `role_permissions` table |
| Dashboards | 15 separate pages | Single adaptive dashboard |
| Route access | `ROLE_PREFIXES` map | Permission-based route registry |
| Campus hierarchy | Flat | Tree via `parent_branch_id` |
| Head Office | Does not exist | Optional `head_offices` table |

---

## Database Tables (New + Changed)

### New: `departments`

```
departments
├── id              UUID PK
├── school_id       FK → schools.id (NOT NULL)
├── campus_id       FK → branches.id (nullable)
├── parent_dept_id  FK → departments.id (nullable — self-referential hierarchy)
├── name            String(200)
├── code            String(50)
├── head_user_id    FK → users.id (nullable — department head)
├── is_active       Boolean
├── description     Text (nullable)
├── created_at
├── updated_at
├── deleted_at
```

Unique: `(school_id, code)`

### Changed: `branches` (add `parent_branch_id`)

```
branches
├── ... existing fields ...
├── parent_branch_id  FK → branches.id (nullable — enables sub-campuses)
```

### Changed: `users` (add `department_id`)

```
users
├── ... existing fields ...
├── department_id   FK → departments.id (nullable)
```

### New: `head_offices`

```
head_offices
├── id              UUID PK
├── name            String(200)
├── code            String(50) UNIQUE
├── is_active       Boolean
├── created_at
├── updated_at
├── deleted_at
```

### New: `head_office_schools` (join table)

```
head_office_schools
├── id              UUID PK
├── head_office_id  FK → head_offices.id
├── school_id       FK → schools.id
├── created_at
```

Unique: `(head_office_id, school_id)`

### New: `modules`

```
modules
├── id              UUID PK
├── code            String(100) UNIQUE — e.g. "finance", "library"
├── name            String(200)
├── description     Text
├── is_core         Boolean — core modules cannot be disabled
├── created_at
├── deleted_at
```

### New: `school_modules` (feature flags per school)

```
school_modules
├── id              UUID PK
├── school_id       FK → schools.id
├── module_code     String(100) — references modules.code
├── status          Enum: enabled | disabled | coming_soon | beta
├── config          JSON (nullable — per-module settings)
├── created_at
├── updated_at
```

Unique: `(school_id, module_code)`

### Changed: `role_permissions` (add scope support)

```
role_permissions
├── ... existing fields ...
├── scope           Enum: global | school | campus | department (default: school)
├── scope_id        String(36) (nullable — the specific entity ID for the scope)
```

---

## Module Registry

Every feature registers itself in a `modules` table:

```python
REGISTERED_MODULES = {
    "students": {
        "name": "Students",
        "is_core": True,
        "permissions": ["create", "edit", "delete", "view", "transfer", "promote"],
        "widgets": ["student-stats", "admission-trend"],
        "routes": ["/students"],
    },
    "finance": {
        "name": "Finance",
        "is_core": False,
        "permissions": ["journal.create", "reports.view", "invoice.create", "payment.receive"],
        "widgets": ["finance-summary", "revenue-chart"],
        "routes": ["/finance"],
    },
    "library": {
        "name": "Library",
        "is_core": False,
        "permissions": ["manage", "borrow", "return", "fine"],
        "widgets": ["library-summary", "borrowing-trend"],
        "routes": ["/library"],
    },
}
```

A school enables/disables modules via `school_modules`. When disabled:
- Its UI routes are hidden
- Its dashboard widgets are hidden
- Its permissions cannot be assigned to roles
- Its API returns "Coming Soon" for non-GET requests

---

## Route Resolution

Route access is no longer determined by `ROLE_PREFIXES`. Instead:

1. A user requests `/finance/invoices`
2. System checks: does the user have `finance.invoice.view` permission?
3. If yes → allow. If no → redirect to best dashboard.

The route-permission mapping is stored in the module registry:

```javascript
// Frontend route registry (generated from modules table)
const ROUTE_PERMISSIONS = {
  "/students": "students.view",
  "/students/create": "students.create",
  "/finance": "finance.journal.create",
  "/finance/invoices": "finance.invoice.view",
  "/library": "library.manage",
  "/library/borrow": "library.borrow",
}
```

---

## What This Enables

| Scenario | Before | After |
|----------|--------|-------|
| School creates "Digital Learning Coordinator" role | Add role name to 5 config files + create dashboard page + create route group | Create role via UI. Assign permissions. Done. |
| School adds ICT department | Nothing (departments don't exist) | Create "ICT" department via UI. Assign staff. Scoped permissions work automatically. |
| School has Head Office | Impossible | Enable `head_office` feature. Create Head Office entity. Associate schools. |
| School enables Library module | Manual config | Toggle "Library" in school settings. Permissions, routes, widgets appear automatically. |
| School has 3 campuses with sub-campuses | Flat list | Tree structure via `parent_branch_id`. |
| New widget needs to show on dashboard | Add to all 15 dashboard pages | Register widget in module. It appears for users with the right permissions. |
