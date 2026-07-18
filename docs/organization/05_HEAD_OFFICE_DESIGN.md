# Head Office Design

## Executive Summary

Some school groups have a central Head Office that governs multiple schools.
Others are independent. ZENOVA currently treats every school as independent —
there is no model for a governing body between Super Admin and School Director.

This document defines the optional Head Office layer: a **pluggable governance
tier** that, when enabled, sits between Super Admin and School Directors
without changing the underlying school architecture.

---

## Why This Change Is Needed

### Problem 1: No Multi-School Governance

School groups (chains, franchises, international networks) have a central
office that sets policy, manages budgets, and oversees multiple schools.
The system cannot represent this structure.

### Problem 2: Super Admin Is Too High

Super Admin manages licensing and platform settings. They should not be
involved in daily school operations. School Directors should report to
a Head Office, not to Super Admin.

### Problem 3: Some Schools Are Independent

Not all schools belong to a group. Forcing a Head Office on independent
schools adds unnecessary complexity. The design must be optional.

---

## Architecture

### When Head Office Is Disabled

```
Super Admin
    │
    └── School Director
          │
          ├── Campus Manager
          ├── Department Head
          └── Teachers
```

This is the current model. It continues to work exactly as before.

### When Head Office Is Enabled

```
Super Admin
    │
    ├── Head Office A (e.g., "ZENOVA Ethiopia")
    │     │
    │     ├── School A.1 (e.g., "Omega School")
    │     ├── School A.2 (e.g., "Summit Academy")
    │     └── School A.3 (e.g., "Renaissance School")
    │
    ├── Head Office B (e.g., "ZENOVA Kenya")
    │     │
    │     ├── School B.1
    │     └── School B.2
    │
    └── Independent School C (no Head Office)
          └── ... (reports directly to Super Admin)
```

---

### Head Office Model

```
head_offices
├── id              UUID PK
├── name            String(200) — "ZENOVA Ethiopia Regional Office"
├── code            String(50) UNIQUE — "ZENOVA-ETH"
├── contact_email   String(255), nullable
├── contact_phone   String(50), nullable
├── address         Text, nullable
├── logo_url        String(500), nullable
├── is_active       Boolean (default: true)
├── created_at
├── updated_at
├── deleted_at
```

### Head Office → School Association

```
head_office_schools
├── id              UUID PK
├── head_office_id  FK → head_offices.id
├── school_id       FK → schools.id (UNIQUE — a school belongs to at most one Head Office)
├── joined_at       DateTime
└── left_at         DateTime, nullable
```

### Head Office Users

Head Office staff are users with `head_office_id` instead of `school_id`:

```python
class User(Base):
    # ... existing fields ...
    head_office_id = Column(String(36), ForeignKey("head_offices.id"), nullable=True, index=True)
```

Head Office users have special permissions:

| Permission | Effect |
|------------|--------|
| `head_office.schools.view` | View all schools under this Head Office |
| `head_office.schools.manage` | Add/remove schools from Head Office |
| `head_office.finance.view` | View finance data across all schools |
| `head_office.reports.view` | Cross-school reports |
| `head_office.settings.manage` | Manage Head Office settings |
| `head_office.directors.manage` | Assign/remove School Directors |

---

### Head Office Roles

Roles scoped to Head Office can see across schools:

```python
# Regional Director role
role = Role(
    name="Regional Director",
    scope="head_office",
    permissions=[
        "head_office.schools.view.global",
        "head_office.finance.view.global",
        "head_office.reports.view.global",
        "finance.reports.view.school",   # Can view any school's finance
        "attendance.read.school",         # Can view any school's attendance
    ]
)
```

### Head Office Dashboard

The Head Office dashboard shows cross-school analytics:

```
┌─ ZENOVA Ethiopia Regional Office ──────────────────────┐
│                                                         │
│  Schools: 12    Students: 8,450    Staff: 1,200        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Revenue      │  │ Attendance   │  │ Performance  │  │
│  │ $2.4M this Q│  │ 94% avg      │  │ A: 42%       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  School Performance (this term):                        │
│  ┌────────────┬───────┬────────┬─────────┬──────────┐  │
│  │ School     │ Stude │ Attend │ Revenue │ Status   │  │
│  ├────────────┼───────┼────────┼─────────┼──────────┤  │
│  │ Omega      │ 1,200 │ 96%    │ $320K   │ ✅       │  │
│  │ Summit     │ 850   │ 92%    │ $210K   │ ⚠        │  │
│  │ Renaissance│ 2,100 │ 97%    │ $540K   │ ✅       │  │
│  └────────────┴───────┴────────┴─────────┴──────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Flag

Head Office is controlled by a feature flag:

```python
settings.FEATURE_HEAD_OFFICE = True  # or False
```

When disabled:
- `head_offices` table exists but is unused
- Head Office-related routes return 404
- `head_office_id` on users is ignored
- Super Admin sees all schools directly

When enabled:
- Super Admin can create Head Offices
- Head Office admins can manage their schools
- School Directors report to their Head Office

---

## Migration Path

Existing systems:
1. Set `FEATURE_HEAD_OFFICE=false` (default) — no change
2. When a school group wants Head Office:
   - Enable the feature flag
   - Create Head Office entity
   - Associate schools
   - Assign Head Office staff
   - Done

No data migration required. No breaking changes.

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Multi-school governance | Impossible | Optional `head_offices` table |
| Super Admin scope | All schools | Can delegate to Head Offices |
| Independent schools | Works | Works (Head Office disabled by default) |
| Cross-school reporting | None | Head Office dashboard + permissions |
| School Directors report to | Super Admin | Head Office (when enabled) |
| Feature gated | N/A | `FEATURE_HEAD_OFFICE` flag |
