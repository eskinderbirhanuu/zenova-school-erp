# Permission Engine

## Executive Summary

ZENOVA's current permission system defines ~30 static permission strings in a
Python class and maps them to role names in a hardcoded dictionary. This
design cannot support custom roles, department-scoped access, or fine-grained
permissions like "approve finance transactions up to $500."

This document defines the target permission engine: a **modular, scoped,
data-driven permission system** that supports unlimited granularity without
code changes.

---

## Why This Change Is Needed

### Problem 1: Permissions Are Hardcoded

Permissions are string constants in `Permission` class. Adding a new
permission requires editing Python code and redeploying.

### Problem 2: No Scoping

A user either has `finance.journal.create` or they don't. There is no way to
say "can create finance journals for the Science department only."

### Problem 3: No Hierarchy

There is no "view own" vs "view department" vs "view all" scope. A teacher
can see all students or none — there is no middle ground.

### Problem 4: No Module Awareness

Permissions are flat strings. There is no way to ask "what module does this
permission belong to?" or "list all permissions for the Finance module."

---

## Target Architecture

### Permission Structure

Every permission has four parts:

```
<module>.<action>.<scope>
```

| Part | Description | Examples |
|------|-------------|----------|
| **module** | The feature area | `students`, `finance`, `library`, `hr` |
| **action** | What can be done | `create`, `read`, `update`, `delete`, `approve`, `export` |
| **scope** | How far the permission reaches | `own`, `department`, `campus`, `school`, `global` |

**Examples:**

| Permission | Meaning |
|------------|---------|
| `students.read.school` | View all students in the school |
| `students.read.department` | View students in own department only |
| `students.read.own` | View own children/records only |
| `finance.journal.create.school` | Create finance journals for entire school |
| `finance.journal.create.department` | Create finance journals for own department |
| `finance.approve.school` | Approve any finance transaction |
| `finance.approve.campus` | Approve transactions for own campus only |
| `library.borrow.school` | Borrow from any school library |
| `library.manage.campus` | Manage library at specific campus |

---

### Permission Registry

Permissions are registered per module, not hardcoded in one file:

```python
# Each module registers its own permissions

MODULE_PERMISSIONS = {
    "students": {
        "label": "Students",
        "permissions": [
            {"key": "create", "label": "Create Students", "default_scope": "school"},
            {"key": "read", "label": "View Students", "default_scope": "school",
             "scope_options": ["own", "department", "campus", "school"]},
            {"key": "edit", "label": "Edit Students", "default_scope": "school"},
            {"key": "delete", "label": "Delete Students", "default_scope": "school"},
            {"key": "transfer", "label": "Transfer Students", "default_scope": "school"},
            {"key": "promote", "label": "Promote Students", "default_scope": "school"},
            {"key": "export", "label": "Export Student Data", "default_scope": "school"},
        ],
    },
    "finance": {
        "label": "Finance",
        "permissions": [
            {"key": "journal.create", "label": "Create Journal Entries", "default_scope": "school"},
            {"key": "journal.read", "label": "View Journal Entries", "default_scope": "school"},
            {"key": "invoice.create", "label": "Create Invoices", "default_scope": "school"},
            {"key": "invoice.read", "label": "View Invoices", "default_scope": "school"},
            {"key": "payment.receive", "label": "Receive Payments", "default_scope": "school"},
            {"key": "payment.refund", "label": "Refund Payments", "default_scope": "school"},
            {"key": "reports.view", "label": "View Finance Reports", "default_scope": "school"},
            {"key": "approve", "label": "Approve Transactions", "default_scope": "school"},
        ],
    },
    "attendance": {
        "label": "Attendance",
        "permissions": [
            {"key": "mark", "label": "Mark Attendance", "default_scope": "department"},
            {"key": "read", "label": "View Attendance", "default_scope": "department"},
            {"key": "reports.view", "label": "Attendance Reports", "default_scope": "school"},
        ],
    },
    "library": {
        "label": "Library",
        "permissions": [
            {"key": "manage", "label": "Manage Library", "default_scope": "campus"},
            {"key": "borrow", "label": "Borrow Books", "default_scope": "school"},
            {"key": "return", "label": "Return Books", "default_scope": "school"},
            {"key": "fine.collect", "label": "Collect Fines", "default_scope": "campus"},
        ],
    },
    "hr": {
        "label": "Human Resources",
        "permissions": [
            {"key": "manage", "label": "Manage HR", "default_scope": "school"},
            {"key": "recruit", "label": "Recruit", "default_scope": "school"},
            {"key": "payroll.view", "label": "View Payroll", "default_scope": "school"},
            {"key": "payroll.process", "label": "Process Payroll", "default_scope": "school"},
        ],
    },
    "settings": {
        "label": "Settings",
        "permissions": [
            {"key": "manage", "label": "Manage Settings", "default_scope": "school"},
            {"key": "users.manage", "label": "Manage Users", "default_scope": "school"},
            {"key": "roles.manage", "label": "Manage Roles", "default_scope": "school"},
            {"key": "departments.manage", "label": "Manage Departments", "default_scope": "school"},
            {"key": "modules.manage", "label": "Manage Modules", "default_scope": "school"},
        ],
    },
    "audit": {
        "label": "Audit",
        "permissions": [
            {"key": "view", "label": "View Audit Logs", "default_scope": "school"},
            {"key": "export", "label": "Export Audit Logs", "default_scope": "school"},
        ],
    },
}
```

---

### Permission Resolution

```
User has roles: [Academic Vice Director, Teacher]

For each role:
  → Look up role_permissions for that role (DB)
  → If not found in DB, fall back to module defaults

Union of all permissions from all roles

Example result:
{
  "attendance.mark.department",     # From Teacher role
  "attendance.read.department",     # From Teacher role  
  "students.read.department",       # From Academic Vice Director
  "teachers.read.school",           # From Academic Vice Director
  "grades.enter.department",        # From Teacher role
  "exams.manage.school",            # From Academic Vice Director
  "reports.view.school",            # From Academic Vice Director
}
```

---

### Scope Enforcement

Scope is enforced at the data access layer, not just the UI:

```python
def get_visible_students(user: User, db: Session) -> Query:
    """Return student query filtered by user's permission scope."""
    if user.has_permission("students.read.school"):
        return db.query(Student).filter(Student.school_id == user.school_id)
    
    if user.has_permission("students.read.campus"):
        return db.query(Student).filter(Student.branch_id == user.branch_id)
    
    if user.has_permission("students.read.department"):
        return db.query(Student).filter(
            Student.department_id == user.department_id
        )
    
    if user.has_permission("students.read.own"):
        return db.query(Student).filter(Student.user_id == user.id)
    
    # No permission → empty
    return db.query(Student).filter(False)
```

---

### Permission Categories

Permissions group into five categories for the UI:

| Category | Example | Icon |
|----------|---------|------|
| **Create** | `students.create` | `+` |
| **Read/View** | `students.read` | `👁` |
| **Update/Edit** | `students.edit` | `✏` |
| **Delete** | `students.delete` | `🗑` |
| **Approve** | `finance.approve` | `✓` |
| **Export** | `students.export` | `⬇` |
| **Manage** | `library.manage` | `⚙` |

---

### UI: Permission Matrix

The permission assignment UI shows a matrix:

```
Module          │ Create │ Read │ Edit │ Delete │ Approve │ Export │ Manage
────────────────┼────────┼──────┼──────┼────────┼─────────┼────────┼───────
Students        │   ✓    │  ✓   │  ✓   │        │         │   ✓    │
Teachers        │   ✓    │  ✓   │      │        │         │        │
Finance         │        │  ✓   │      │        │    ✓    │   ✓    │
Attendance      │        │  ✓   │      │        │         │        │
Library         │        │      │      │        │         │        │
Settings        │        │      │      │        │         │        │   ✓
```

Each cell shows a scope selector when clicked: `Own | Dept | Campus | School`

---

### Backward Compatibility

The old permission strings (e.g. `students.create`) are still valid.
The system automatically maps them to `students.create.school` when no
scope is specified. All existing `require_permission()` calls continue
to work unchanged.

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Permission definition | Static Python class | Data-driven module registry |
| Scope | None (binary have/don't have) | 4 levels: own, dept, campus, school |
| Module association | Implicit (by prefix convention) | Explicit (module registry) |
| Adding new permission | Edit Python + redeploy | Add to module registry (data change) |
| UI assignment | Cannot be done | Permission matrix with scope selector |
