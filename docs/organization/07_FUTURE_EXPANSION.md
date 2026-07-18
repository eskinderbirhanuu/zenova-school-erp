# Future Expansion

## Executive Summary

The architecture defined in this series is designed for the next 5–10 years
of ZENOVA's growth. This document identifies specific future scenarios and
explains why the architecture naturally accommodates them without redesign.

---

## Scenario 1: New Department Types

**2030:** Schools create departments that don't exist today.

| Future Department | Why It Would Exist |
|-------------------|-------------------|
| AI & Robotics | Schools add AI curriculum |
| Sustainability | Environmental education becomes mandatory |
| Mental Health | Dedicated wellness departments |
| Entrepreneurship | Business incubation in schools |
| Esports | Competitive gaming programs |

**Why the architecture handles it:**

Departments are data rows, not code. Creating "AI & Robotics" department:

1. Open Organization Builder
2. Click "Add Department"
3. Name: "AI & Robotics"
4. Assign head, set parent department
5. Assign teachers
6. Done.

Zero code changes. Zero deployment. The department exists immediately.

---

## Scenario 2: New Roles

**2031:** Schools invent roles that don't exist today.

| Future Role | Description |
|-------------|-------------|
| AI Integration Lead | Manages AI tools across curriculum |
| Wellness Coordinator | Student mental health programs |
| Industry Liaison | Corporate partnership management |
| Data Protection Officer | GDPR/compliance (regulation-driven) |
| Remote Learning Facilitator | Hybrid classroom management |

**Why the architecture handles it:**

Roles are configurable data records:

1. Open Organization Builder → Roles
2. Click "Create Role"
3. Name: "AI Integration Lead"
4. Select permissions: `teachers.read`, `timetable.manage`, `reports.view`
5. Choose inheritance: "Teacher" (gets base permissions automatically)
6. Save.

The new role appears in:
- Role assignment dropdowns
- Permission checks
- Dashboard widgets (auto-filtered by permissions)
- Menu visibility (auto-resolved from permissions)

No route groups, no layout files, no config changes needed.

---

## Scenario 3: New Permissions

**2032:** New regulations require audit permissions for AI-generated content.

**Why the architecture handles it:**

Permissions are registered in the module registry:

```python
# In the new "ai-governance" module
MODULE_PERMISSIONS["ai_governance"] = {
    "label": "AI Governance",
    "permissions": [
        {"key": "content.review", "label": "Review AI Content", "default_scope": "school"},
        {"key": "content.approve", "label": "Approve AI Content", "default_scope": "school"},
        {"key": "logs.view", "label": "View AI Audit Logs", "default_scope": "school"},
        {"key": "logs.export", "label": "Export AI Audit Logs", "default_scope": "school"},
    ],
    "widgets": [
        {"id": "ai-content-queue", "permission": "ai_governance.content.review"},
    ],
}
```

The module registers itself. Permissions appear in the permission matrix
automatically. Roles can be assigned these permissions via the UI.

No changes to the permission engine, role engine, or dashboard engine.

---

## Scenario 4: Module Expansion

**2033:** ZENOVA adds a new "Transportation" module.

**Why the architecture handles it:**

```python
REGISTERED_MODULES["transportation"] = {
    "name": "Transportation",
    "is_core": False,
    "permissions": ["routes.manage", "drivers.manage", "vehicles.manage",
                    "tracking.view", "incidents.report"],
    "widgets": ["fleet-summary", "route-map", "driver-status"],
    "routes": ["/transportation"],
}
```

Step-by-step:
1. Add Transportation module to module registry
2. Its permissions appear in the permission matrix
3. Schools enable it via `school_modules` (feature flag)
4. Roles can be assigned transportation permissions
5. Users with those permissions see transportation widgets on dashboard
6. The route `/transportation` resolves via `ROUTE_PERMISSIONS` map

The core architecture (permission engine, role engine, dashboard engine)
is untouched.

---

## Scenario 5: New Access Scope

**2034:** A school wants "class-section scoped" permissions — a teacher can
only see their assigned section, not the entire department.

**Why the architecture handles it:**

The permission engine already supports `scope`. Adding a new scope value
`section` requires:

1. Add "section" to `SCOPE_OPTIONS` in the permission registry
2. Add scope enforcement in the data access layer
3. The permission matrix UI automatically shows the new scope option

```python
SCOPE_OPTIONS = ["own", "section", "department", "campus", "school", "global"]
```

No change to the role or dashboard engine. Just add the scope level.

---

## Scenario 6: Multi-Region International Schools

**2035:** ZENOVA expands to 30 countries. Each country has different
curriculum requirements, compliance rules, and organizational norms.

**Why the architecture handles it:**

```
Super Admin
├── Head Office: ZENOVA Ethiopia
│   ├── Omega School (Ethiopian Curriculum)
│   └── Summit Academy (IGCSE Curriculum)
├── Head Office: ZENOVA UAE
│   ├── Dubai International School (IB Curriculum)
│   └── Abu Dhabi Academy (American Curriculum)
└── Head Office: ZENOVA UK
    └── London College (British Curriculum)
```

Each school can:
- Define its own departments
- Create its own roles
- Assign its own permissions
- Enable the modules it needs
- Design its own organizational chart

Head Offices can:
- View cross-school analytics
- Set school-level policies
- Manage school directors
- Generate regional reports

The architecture does not care about curriculum, country, or region.
It just needs School → Departments → Roles → Permissions.

---

## Scenario 7: Third-Party Integrations

**2036:** An external LMS needs role and permission data via API.

**Why the architecture handles it:**

```
GET /api/v1/organization/export
{
  "departments": [...],
  "roles": [...],
  "permissions": [...],
  "assignments": [...]
}
```

The organization structure is pure data — easily exportable, importable,
and synchronizable. The API didn't need to be designed for this; it's
just the natural consequence of making everything data-driven.

---

## Scenario 8: AI-Generated Role Suggestions

**2037:** ZENOVA AI analyzes a school's module usage and suggests new roles.

```
AI Suggestion:
  "Based on your school's usage patterns, 80% of 'Timetable Management'
   is done by 'Academic VP'. Consider creating a 'Timetable Officer' role
   to delegate this task."

Suggested Role:
  - Name: Timetable Officer
  - Inherits: Teacher
  - Permissions: timetable.manage.campus, attendance.read.campus
  - One-click approve
```

Since roles are pure data, AI can create, suggest, and optimize them
without any architectural changes.

---

## Scenario 9: Self-Service Role Marketplace

**2038:** Schools share role templates:

```
Role Marketplace
├── "Digital Learning Coordinator" (by Omega School)
├── "Wellness Coordinator" (by Summit Academy)
├── "Industry Liaison" (by London College)
└── "Data Protection Officer" (by Dubai School)

[Import to My School]
```

Roles are JSON. Sharing them is sharing data. No architecture changes.

---

## What Will NOT Change

Throughout all these scenarios (2030–2038), the following remain stable:

| Component | Stable Because |
|-----------|---------------|
| **Permission Engine** | Module + Action + Scope pattern is abstract enough |
| **Role Engine** | Roles are data with inheritance — not code |
| **Department Engine** | Hierarchy model handles any org structure |
| **Dashboard Engine** | Widgets resolve from permissions, not roles |
| **Auth Layer** | Permission checks don't change, only the data |
| **API Contracts** | New features add endpoints, don't break existing ones |
| **Database Schema** | Core tables (schools, users, roles, permissions) are stable |
| **Frontend Architecture** | Single dashboard + dynamic menu = no new pages needed |

---

## Constraints That Enable Longevity

1. **Data over code.** Every configurable aspect is a database record.
2. **Permission-first.** No system behavior is tied to a role name.
3. **Module isolation.** Modules register themselves and do not touch core.
4. **Scope abstraction.** Scopes can be extended without changing the engine.
5. **Optional complexity.** Head Office, departments, and modules are opt-in.
