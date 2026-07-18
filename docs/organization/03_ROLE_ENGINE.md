# Role Engine

## Executive Summary

ZENOVA currently ships 15 hardcoded roles. Schools cannot create custom roles
without modifying code. A role is just a name with a hardcoded permission
list in a Python dictionary.

This document defines the target role engine: a **fully dynamic, school-scoped,
data-driven role system** where roles are created, edited, and assigned through
the UI with zero code changes.

---

## Why This Change Is Needed

### Problem 1: Roles Are Hardcoded

`ROLE_PERMISSIONS` dict in `permissions.py` defines every role's permissions.
Adding "Digital Learning Coordinator" means editing this file.

### Problem 2: Roles Are Global Per School

A role named "DIRECTOR" exists once per school. But a large school might have
"Academic Director" and "Administrative Director" — two different roles with
different permissions.

### Problem 3: No Role Hierarchy

There is no "Director inherits all Teacher permissions" concept. Every role
must list its permissions explicitly.

### Problem 4: No Department-Scoped Roles

A "Math Department Head" role cannot be created with permissions scoped to
only the Math department.

---

## Target Architecture

### Role Definition

A role is a data record in the `roles` table:

```json
{
  "id": "uuid",
  "school_id": "school-uuid",
  "name": "Academic Vice Director",
  "description": "Oversees academic programs and teacher performance",
  "is_active": true,
  "scope": "school",
  "scope_id": null,
  "inherits_from": null,
  "permissions": [
    "teachers.read.school",
    "attendance.read.school",
    "timetable.manage.school",
    "exams.manage.school",
    "grades.read.school",
    "reports.view.school",
    "students.read.department"
  ]
}
```

### Role Properties

| Property | Description |
|----------|-------------|
| **`name`** | Human-readable name (e.g., "Academic Vice Director") |
| **`school_id`** | School this role belongs to (null = system role) |
| **`scope`** | `global` | `school` | `campus` | `department` |
| **`scope_id`** | The specific entity ID for the scope |
| **`inherits_from`** | Optional parent role ID — inherit all its permissions |
| **`permissions`** | List of permission keys assigned to this role |

### Role Inheritance

A role can inherit permissions from another role:

```
Academic Vice Director
  └── inherits from: Teacher
      └── inherits from: none
```

Effective permissions = Role's own permissions ∪ inherited permissions.

This eliminates duplication. Teacher permissions are defined once,
then Academic Vice Director adds a few more on top.

### Role Scoping

Roles can be scoped to specific departments:

| Role | Scope | Scope ID | Effective |
|------|-------|----------|-----------|
| Math Department Head | `department` | math-dept-uuid | Can manage Math department only |
| Science Department Head | `department` | science-dept-uuid | Can manage Science department only |
| Campus Director | `campus` | campus-uuid | Can manage specific campus only |
| School Director | `school` | null | Can manage entire school |

### Department-Scoped Role Assignment

A user assigned to the "Math Department Head" role with scope `department`
automatically has their permissions filtered to only the Math department:

```python
# When checking permission with scope
def has_permission(user, permission_key):
    # Get all permission strings
    for role in user.roles:
        perms = get_role_permissions(role)
        for p in perms:
            if p.matches(permission_key, user.scope_context):
                return True
    return False
```

---

## Role Assignment

### User-to-Role Assignment

Already implemented via `user_roles` table:

```json
{
  "user_id": "user-uuid",
  "role_id": "academic-vp-role-uuid",
  "assigned_by": "admin-uuid",
  "assigned_at": "2026-07-17T10:00:00Z",
  "scope": "department",
  "scope_id": "science-dept-uuid",
  "reason": "Promoted to Head of Science"
}
```

The `scope` and `scope_id` on the assignment allow overriding the role's
default scope on a per-assignment basis. This means:

- A user can be "Math Department Head" for Math AND "Science Teacher" for
  Science in the same session.
- One role, multiple scoped assignments.

---

## Creating Roles Via UI

The Organization Builder UI provides:

1. **Role Name** — text input
2. **Description** — textarea
3. **Inherits From** — dropdown (optional parent role)
4. **Scope** — dropdown (global, school, campus, department)
5. **Permission Matrix** — modules × CRUD actions × scopes

No code changes, no deployment, no restart.

---

## Default Roles

The system seeds these default roles on installation (can be edited/deleted):

| Role | Inherits From | Typical Permissions |
|------|---------------|-------------------|
| **Super Admin** | — | All permissions, global scope (system role, cannot be deleted) |
| **Director** | Teacher | School-wide finance, HR, reports, settings |
| **Teacher** | — | Students.view.department, attendance.mark.department, grades.enter.department |
| **Registrar** | — | Students.{create,edit,view}.school, attendance.read.school |
| **Finance Officer** | — | Finance.{create,read}.school, reports.view.school |
| **HR Officer** | — | HR.manage.school, attendance.read.school |
| **Store Keeper** | — | Inventory.manage.campus |
| **Librarian** | — | Library.manage.campus |
| **Parent** | — | Students.read.own, finance.read.own |
| **Student** | — | Grades.read.own, attendance.read.own |

---

## Example: Building a Role

A school wants to create "Digital Learning Coordinator" in 2029:

1. Open Organization Builder → Roles → Create Role
2. Name: "Digital Learning Coordinator"
3. Inherits From: "Teacher" (gets all teacher permissions automatically)
4. Add: `timetable.manage.school`, `reports.view.school`
5. Add: `attendance.read.school` (broader scope than Teacher's department)
6. Click Save.

Result: The role exists. Users assigned to it see the correct dashboard
widgets, menu items, and have API access — zero code changes.

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Role definition | Hardcoded in Python dict | DB record, created via UI |
| Adding a role | Edit 5+ files, redeploy | Click "Create Role" |
| Permission mapping | Dict lookup | `role_permissions` table |
| Role hierarchy | None | `inherits_from` parent chain |
| Department scoping | Not possible | `scope` + `scope_id` on role/assignment |
| User limit per role | 1 role per user (legacy) | Unlimited roles per user |
