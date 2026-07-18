# Department Engine

## Executive Summary

ZENOVA today has no concept of school-level departments. Teachers and staff
have free-text `department` fields that serve no authorization purpose. A
Math teacher and a Physics teacher are identical to the system.

This document defines the target department engine: a **hierarchical,
school-scoped, permission-aware department system** that mirrors real
school organizational structures.

---

## Why This Change Is Needed

### Problem 1: Departments Don't Exist

`TeacherProfile.department` and `StaffProfile.department` are free-text
strings. There is no `departments` table, no department CRUD, no department
validation. Users type "Math" in one place and "Mathematics" in another —
they are treated as different departments.

### Problem 2: No Hierarchy

Real schools have nested departments:
- Science Department
  - Physics Sub-Department
  - Chemistry Sub-Department
  - Biology Sub-Department

The system cannot model this.

### Problem 3: No Department Head

There is no concept of "Head of Science Department." All teachers are equal
in the authorization model.

### Problem 4: No Department-Based Data Isolation

A Physics teacher can see Chemistry students' data. There is no scoping by
department.

### Problem 5: No Department-Specific Routes/UI

There are no pages for managing departments, viewing department structure,
or assigning users to departments.

---

## Target Architecture

### Department Model

```
departments
├── id                  UUID PK
├── school_id           FK → schools.id (NOT NULL)
├── campus_id           FK → branches.id (nullable — department at a specific campus)
├── parent_dept_id      FK → departments.id (nullable — self-referential for hierarchy)
├── name                String(200) — "Mathematics"
├── code                String(50) — "MATH" (unique per school)
├── head_user_id        FK → users.id (nullable — department head)
├── is_active           Boolean
├── description         Text
├── created_at
├── updated_at
├── deleted_at

UNIQUE (school_id, code)
INDEX (parent_dept_id)
INDEX (head_user_id)
```

### Hierarchy

Departments form a tree using `parent_dept_id`:

```
School
├── Academic Affairs
│   ├── Mathematics Department
│   │   ├── Pure Mathematics
│   │   └── Applied Mathematics
│   ├── Science Department
│   │   ├── Physics
│   │   ├── Chemistry
│   │   └── Biology
│   └── Languages Department
│       ├── English
│       └── Foreign Languages
├── Administration
│   ├── Human Resources
│   ├── Finance
│   └── Transport
└── Student Services
    ├── Guidance & Counseling
    ├── Clinic
    └── Library
```

### Department Head

Each department can have a head user. The department head automatically
receives department-scoped permissions:

| Permission | Effect |
|------------|--------|
| `students.read.department` | Can view students in their department |
| `attendance.read.department` | Can view attendance for their department |
| `teachers.read.department` | Can view teachers in their department |
| `department.manage` | Can edit department settings, assign sub-department heads |

Department head is assigned by a user with `departments.manage` permission.

### User Department Assignment

Users have a `department_id` FK on the `users` table:

```python
user.department  # → Department object
user.department_id  # → UUID string
```

This enables:
- Department-scoped data queries
- Department-based reporting
- Department hierarchy traversal
- Automatic department head recognition

---

## Department Operations

### Create Department

```
POST /api/v1/departments
{
  "school_id": "...",
  "campus_id": null,
  "parent_dept_id": null,
  "name": "Mathematics",
  "code": "MATH",
  "head_user_id": null,
  "description": "Mathematics Department"
}
```

### Department Tree

```
GET /api/v1/departments/tree?school_id=xxx

Returns nested tree structure:
[
  {
    "id": "academic-uuid",
    "name": "Academic Affairs",
    "children": [
      {
        "id": "math-uuid",
        "name": "Mathematics",
        "head": { "id": "...", "full_name": "Dr. Smith" },
        "children": [...]
      }
    ]
  }
]
```

### Assign User to Department

```
PATCH /api/v1/users/{user_id}
{
  "department_id": "math-dept-uuid"
}
```

### Bulk Department Assignment

```
POST /api/v1/departments/{dept_id}/assign-users
{
  "user_ids": ["uuid1", "uuid2", "uuid3"],
  "reason": "New academic year assignment"
}
```

---

## Department-Aware Permissions

### Scope Enforcement Examples

```python
# Teacher can only see students in their department
if user.has_permission("students.read.department"):
    students = db.query(Student).join(User).filter(
        User.department_id == user.department_id
    ).all()

# Department head sees department + sub-departments
if user.is_department_head:
    dept_ids = [user.department_id] + get_sub_department_ids(user.department_id)
    students = db.query(Student).filter(
        Student.department_id.in_(dept_ids)
    ).all()

# School-wide access
if user.has_permission("students.read.school"):
    students = db.query(Student).filter(
        Student.school_id == user.school_id
    ).all()
```

### Department-Scoped Roles

A role can be scoped to a specific department:

```python
math_head_role = Role(
    name="Department Head",
    scope="department",
    scope_id="math-dept-uuid",
    permissions=["students.read.department", "teachers.read.department"]
)
```

A user assigned this role can only see data within the Math department.

---

## Small School Example

A small school with 5 teachers and 1 director:

```
Departments:
├── Teaching (all teachers belong here)
└── Administration (director only)
```

The director has:
- `settings.manage.school` — manage entire school
- `finance.journal.create.school` — handle all finance
- `hr.manage.school` — manage all staff
- `attendance.read.school` — view all attendance

Teachers have:
- `attendance.mark.department` — mark for their classes
- `students.read.department` — see their students

No code changes required. The school simply creates two departments.

---

## Large School Example

A large school with 200 teachers, 15 departments, 3 campuses:

```
Departments:
├── Mathematics (Campus A)
├── Mathematics (Campus B)
├── Science (Campus A)
│   ├── Physics
│   └── Chemistry
├── Administration
│   ├── Finance
│   ├── HR
│   └── Transport
├── Student Services
│   ├── Clinic
│   ├── Library (Campus A)
│   └── Library (Campus B)
└── ICT
```

Each department has a head. The head of Science manages Physics and Chemistry
sub-departments through hierarchy. The Finance head sees school-wide finance
data but cannot manage HR.

No code changes. No new role definitions. Just data.

---

## UI: Department Tree

The Organization Builder shows an interactive tree:

```
📂 Academic Affairs           [⚙] [➕] [🗑]
  📂 Mathematics              [👤 Dr. Smith] [⚙] [➕]
    📂 Pure Mathematics       [👤 Dr. Jones] [⚙]
    📂 Applied Mathematics    [👤 Vacant] [⚙]
  📂 Science                  [👤 Dr. Lee] [⚙] [➕]
    📂 Physics                [👤 Dr. Kim] [⚙]
    📂 Chemistry              [👤 Dr. Patel] [⚙]
```

- Click [👤] to assign/change department head
- Click [⚙] to edit department settings
- Click [➕] to add sub-department
- Drag to reorder
- Right-click for context menu

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Department model | Free-text string | `departments` table with FK |
| Hierarchy | None | Self-referential `parent_dept_id` |
| Department head | None | `head_user_id` FK |
| User→Department | Not tracked | `department_id` on `users` |
| Data scoping | None (all-or-nothing) | Scope filters by department |
| CRUD API | None | Full REST for departments |
| UI | None | Tree view + assignment interface |
