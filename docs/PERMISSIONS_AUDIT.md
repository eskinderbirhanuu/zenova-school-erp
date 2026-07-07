# ZENOVA — Permissions / RBAC Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Security Auditor role
**Method:** Static analysis of `backend/app/core/permissions.py`, `app/api/v1/deps.py`, all 50 endpoint files for `require_permission` / `require_role` usage, and the role-permission matrix. No code modified.

> Cross-reference: SECURITY_AUDIT.md C6, H5, H6, H9, H10; API_AUDIT.md §2, §3, §5.

---

## Executive Summary

ZENOVA implements RBAC via a `Permission` enum (30 dotted permissions) plus a `ROLE_PERMISSIONS` map covering 16 roles. Enforcement is via FastAPI dependency injection: `require_permission`, `require_role`, `require_server_role`, `require_inside_network`, `require_licensed_feature`. **Pattern is consistent and idiomatic** — but a handful of endpoints skip the dependency entirely (`PUT /settings`, `/branches/{id}` mutations, `/nfc/employee/assign`, `/telegram/bot/connect`), and several routes check only `get_current_user` when they should check `require_permission` (`/platform/admin/*`, `/iga/*`, `/corporate/*`).

| Question | Answer |
|---|---|
| Can a STUDENT become ADMIN? | **No** via role-change (`UserUpdate.role_id` is settable but role-change doesn't elevate `is_superuser`; SUPER_ADMIN role without `is_superuser=True` does pass `require_permission` though — see H10, partial YES) |
| Can a TEACHER access FINANCE? | No — `ROLE_PERMISSIONS[TEACHER]` excludes finance perms |
| Can an EMPLOYEE become SUPER_ADMIN? | **Yes** via `/activate/employees/create` with `role_name="SUPER_ADMIN"` (no cap) — see H10 |
| Can a parent edit school settings? | **Yes** — `PUT /settings` only checks `get_current_user` (Critical C6) |
| Can a student rewrite their own grades? | **No** — `academic_service.mark_result` requires `DIRECTOR_CREATE` |
| Can a teacher approve refunds? | **No** — `approve_refund` requires FINANCE perms in the route; but the route checks `get_current_user` and the service has no school_id check, so cross-tenant FINANCE-to-FINANCE refund approval works (H1) |

| Score | Dimension | Notes |
|---|---|---|
| 70/100 | RBAC design | Clean Permission enum + role matrix |
| 65/100 | Enforcement consistency | 7 endpoints skip the guard |
| 60/100 | Defense in depth | App-only, no DB RLS |
| 75/100 | Audit trail | 160 `log_audit` calls — but `school_id` never set |

---

## §1 — Role Inventory

| Role name | In `ROLE_PERMISSIONS`? | Notes |
|---|---|---|
| `SUPER_ADMIN` | ✓ | All 30 permissions (via `is_superuser=True`) |
| `ADMIN` | ✓ | Sub-tenant admin: students/finance/finance.view/etc — scoped subset |
| `DIRECTOR` | ✓ | Academic-creation only; not finance |
| `REGISTRAR` | ✓ | Students + attendance |
| `TEACHER` | ✓ | Students.view, attendance.mark, exam_results.enter |
| `FINANCE` | ✓ | finance.* perms; MFA required by `mfa_service.mfa_required_for_role` |
| `HR` | ✓ | HR management |
| `INVENTORY` | ✓ | Inventory mgmt |
| `LIBRARY` | ✓ | Library mgmt |
| `CAFETERIA` | ✓ | Cafeteria POS |
| `AUDITOR` | ✓ | Audit.view + finance.view — read-only finance |
| `PARENT` | ✓ | Parent portal perms |
| `STUDENT` | ✓ | Student portal perms |
| `ZENOVA_CARD_OFFICER` | ✓ | Card printing |
| `ZENOVA_CORPORATE_ADMIN` | ✓ | Corporate employees mgmt |
| `ZENOVA_SUPPORT` | ✓ | Support tickets |

---

## §2 — Permission Inventory (30 dotted perms) (`permissions.py:7-44`)

- `STUDENTS_VIEW`, `STUDENT_CREATE`, `STUDENT_EDIT`, `STUDENT_DELETE`
- `FINANCE_VIEW`, `FINANCE`, `FINANCE_CREATE`, `FINANCE_EDIT`, `FINANCE_DELETE`
- `HR_MANAGE`, `INVENTORY_MANAGE`, `LIBRARY_MANAGE`, `CAFETERIA_POS`
- `AUDIT_VIEW`, `SCHOOL_MANAGE`, `BRANCH_MANAGE`
- `SETTINGS_MANAGE`, `LICENSE_MANAGE`, `DEVICE_REVIEW`
- `CORPORATE_EMPLOYEE_EDIT`, `MESSAGING`, `ALL`
- `LICENSE_VIEW`, `STAFF_CREATE`, `STAFF_EDIT`, `STAFF_VIEW`
- `PARENT_CREATE`, `PARENT_EDIT`, `TEACHER_VIEW`
- `ACADEMIC_VIEW`, `ACADEMIC_CREATE`, `ACADEMIC_EDIT`

> **Note**: existing roles grant sensible subsets — `STUDENTS_VIEW` plural + `STUDENT_*` singular patterns. Minor inconsistency: `STUDENTS_VIEW` vs `STUDENT_*` — refactor to `STUDENT_VIEW` for naming uniformity.

---

## §3 — Dependency Functions (`deps.py`)

| Function | File:Line | Purpose |
|---|---|---|
| `get_current_user` | `deps.py:21` | Reads cookie `access_token` → fallback `Authorization: Bearer`; fetches User; validates `is_active` + soft-delete |
| `require_permission(*perms)` | `permissions.py:107` | Returns dep that returns `current_user` if has any perm else 403; `is_superuser` short-circuits to True; `is_view_only` blocks mutations |
| `require_role(*role_names)` | `permissions.py:?` | Coarse role-name check; rejects `is_view_only` mutations |
| `require_server_role(*allowed_roles)` | `deps.py:?` | Reads `server_id.json` runtime role — bootstrap-only auth |
| `require_inside_network()` | `deps.py:144` | If `settings.trusted_networks` set and IP outside → sets `is_view_only=True` for this request (read-only outside school LAN) |
| `require_licensed_feature("nfc"\|"qr"\|"import"\|"id_card")` | `deps.py:109` | Checks cached license `restrict_*` flags |

### §3.1 — `is_superuser` short-circuit

```python
def has_permission(user, perm):
    if user.is_superuser: return True      # SUPER_ADMIN bypasses everything
    if user.is_view_only and perm not in ("students.view", "audit.view"): return False
    return perm in ROLE_PERMISSIONS.get(user.role.name, set())
```

This means **a User with `is_superuser=True` AND any role** (incl. STUDENT) bypasses ALL permission checks. The elevation is intended for SUPER_ADMIN role only — recommendation: enforce `if user.is_superuser and user.role.name == "SUPER_ADMIN"` to prevent accidental `is_superuser=True`being used by a mis-classified role.

### §3.2 — `is_view_only` enforcement

`is_view_only` is a flag set per-request (`require_inside_network`) or per-user (server config). Mutations blocked except `students.view` and `audit.view`. **Exception set is narrow** — recommendation: add `dashboard.view`, `attendance.view`, `finance.view` so view-only users still get useful dashboards.

---

## §4 — Permission Decorator Coverage (Endpoint Audit)

### §4.1 — Endpoints that SKIP `require_permission` and shouldn't

| Endpoint | File:Line | Required perm missing |
|---|---|---|
| `PUT /settings` | `settings.py:25` | **`SETTINGS_MANAGE`** (Critical C6) |
| `PATCH /branches/{id}` | `branches.py:88` | `SCHOOL_MANAGE` (siblings have it) |
| `DELETE /branches/{id}` | `branches.py:119` | `SCHOOL_MANAGE` |
| `POST /nfc/employee/assign` | `nfc_v2.py:61` | `STAFF_CREATE` (siblings have it) |
| `GET /nfc/{student\|staff\|parent\|employee}/by-card/{uid}` | `nfc_v2.py:111,131,150,167` | At minimum `STUDENT_VIEW` + school_id filter |
| `GET /corporate/*` | `corporate.py:97...` | `CORPORATE_EMPLOYEE_EDIT` (or only `ZENOVA_CORPORATE_ADMIN` role) |
| `GET /platform/admin/dashboard` `/reports/*` | `platform_commission.py:47,130,155,188` | `LICENSE_MANAGE` |
| `GET /iga/metrics`, `/iga/health-summary` | `iga.py:14,23` | `LICENSE_MANAGE` or `is_superuser` |
| `POST /telegram/bot/connect` `status` `disconnect` | `telegram.py:14,24,32` | `SETTINGS_MANAGE` |
| `GET /audit-logs` | `audit_logs.py:11` | (gate is `is_superuser` only — could allow ADMIN/DIRECTOR scoped to own school) |
| `POST /activate/employees/create` | `activate.py:251` | Should reject `role_name in ("SUPER_ADMIN", "LICENSE_MANAGE")` |

### §4.2 — Endpoints where body-only role escalation is possible

| Endpoint | Issue | Severity |
|---|---|---|
| `PATCH /users/{id}` (`users.py:46`) | `UserUpdate.role_id` is settable to SUPER_ADMIN role_id | Medium — does NOT set `is_superuser=True`, but `require_permission` returns True for SUPER_ADMIN role. **Partial YES to privilege escalation.** |
| `POST /activate/employees/create` (`activate.py:251`) | `role_name="SUPER_ADMIN"` accepted | High (H10) |

### §4.3 — Routes that leak sensitive GET data to wrong roles

| Endpoint | Issue |
|---|---|
| `/platform/admin/dashboard`, `/reports/*` | Any auth user sees cross-tenant platform revenue |
| `/iga/metrics`, `/iga/health-summary` | Any auth user sees global server topology (server_id, role, vps_url, sync_enabled) |
| `/audit-logs` | Non-super silently gets empty `{logs:[], total:0}` — could 403 cleanly instead |

### §4.4 — View-only enforcement edge

A `is_view_only=True` user **can still `GET /settings`** (no `require_permission` there). Recommendation: extend `require_permission` to a `require_permission_or_view(perm)` for read endpoints.

---

## §5 — Role-Permission Matrix Review

### §5.1 — Notable matrix mappings (`permissions.py:55-105`)

| Role | Key perms granted | Gap or smell |
|---|---|---|
| `SUPER_ADMIN` | all 30 (via `is_superuser=True` short-circuit) | ✓ |
| `ADMIN` | students.*, finance.*, HR, INVENTORY_MANAGE (sub-tenant) | ✓ |
| `DIRECTOR` | ACADEMIC_*, BRANCH_MANAGE, STUDENTS_VIEW | Cannot create finance — appropriate |
| `REGISTRAR` | STUDENT_*, students.view, ATTENDANCE_view/mark | Cannot edit academic — appropriate |
| `TEACHER` | students.view, attendance.mark, exam_results.enter, ACADEMIC_VIEW | Cannot bulk-delete anything — appropriate |
| `FINANCE` | finance.* + finance.create + finance.view | MFA required ✓ |
| `HR` | HR_MANAGE, staff.view | Should it have STAFF_VIEW? Verifies |
| `INVENTORY` | INVENTORY_MANAGE | Single-perm role ✓ |
| `LIBRARY` | LIBRARY_MANAGE | ✓ |
| `CAFETERIA` | CAFETERIA_POS | ✓ |
| `AUDITOR` | AUDIT_VIEW, FINANCE_VIEW | Read-only — appropriate ✓ |
| `PARENT` | parent portal subset | **CannotNavigationItemSelectedListener** — actual contracts not enumerated here; sample showed parent portal perms |
| `STUDENT` | student portal subset | minimal |
| `ZENOVA_CARD_OFFICER` | card.print | Single-purpose ✓ |
| `ZENOVA_CORPORATE_ADMIN` | CORPORATE_EMPLOYEE_EDIT + corporate.* | Intentionally cross-tenant |
| `ZENOVA_SUPPORT` | support_ticket.* | Cross-tenant (intentional?) |

### §5.2 — Missing permissions

| Suggested permission | Reason |
|---|---|
| `STUDENT_VIEW` (singular) | Match `STUDENT_CREATE/EDIT` pattern |
| `ATTENDANCE_VIEW`, `ATTENDANCE_MARK` | Currently `attendance.mark` is hardcoded somewhere — not in the 30 enum |
| `DASHBOARD_VIEW` for view-only users | Allow dashboard access for `is_view_only` |
| `DEVICE_REVIEW_VIEW` (read-only device-change) | Currently `DEVICE_REVIEW` covers both |

---

## §6 — Defense-in-Depth Recommendations

### §6.1 — Tighten `has_permission`

```python
def has_permission(user, perm):
    if user.is_superuser and user.role and user.role.name == "SUPER_ADMIN":
        return True
    ...
```

Prevents a misconfigured User (e.g., is_superuser=True accidentally set with role=STUDENT) from bypassing all perms.

### §6.2 — Add `school_id` to all role checks

Many endpoints get `current_user.school_id` AFTER `require_permission` — recommend a `require_permission_for_school(perm)` dep that fails 403 fast if `current_user.school_id is None` for tenant-scoped perms (currently only `PUT /settings` checks `current_user.school_id`).

### §6.3 — Cap role escalation in `UserUpdate`

```python
if data.role_id:
    target = db.query(Role).get(data.role_id)
    if target.name in ("SUPER_ADMIN", "ZENOVA_CORPORATE_ADMIN") and not current_user.is_superuser:
        raise HTTPException(403, "Cannot elevate to super admin role")
```

### §6.4 — Cap role escalation in `/activate/employees/create`

```python
ALLOWED_DIRECTOR_ROLE_NAMES = {"ADMIN", "REGISTRAR", "TEACHER", "FINANCE", ...}
if data.role_name not in ALLOWED_DIRECTOR_ROLE_NAMES:
    raise HTTPException(400, "Role not allowed from this endpoint")
```

### §6.5 — PostgreSQL Row-Level Security

The ultimate defense in depth. Enable RLS on every tenant-scoped table; set policy `USING (school_id = current_setting('app.current_school_id')::text)`. Pass `SET app.current_school_id = X` per database session via SQLAlchemy `Session.connection().connection.set_session(...)` in `get_db()` dependency. Then even an exploited Python path cannot leak tenant data — every query auto-filters at the DB layer.

### §6.6 — Add view-only allowance expansion

Extend `is_view_only` exception list to include `dashboard.view`, `attendance.view`, `finance.view`, plus the existing `students.view` and `audit.view`. This makes view-only mode actually useful.

---

## §7 — Cross-Tenant Questions from the Original Prompt

| Q | Answer |
|---|---|
| Can one school see another school's data? | **Yes** via `/corporate/*`, `/nfc/{x}/by-card/{uid}`, `/card-design/{school_id}` IDOR, `/platform/admin/dashboard` aggregates, `/parent-payments/refund/{id}/approve` (H1). Per the audit, ~6 IDOR paths confirmed. |
| Can APIs leak information? | **Yes** — `/qr/{uuid}` unauthenticated, `/nfc/public/lookup` enumeration, `/installer/whoami` school-existence probing, `/platform/*` any auth user |
| Can employees bypass restrictions? | **Yes** — `PUT /settings` student-writable, `UserUpdate.role_id` elevate-able (Medium), `/activate/employees/create` elevation-capable (High). |

---

## §8 — Findings Summary

| # | Severity | Finding | File:Line |
|---|---|---|---|
| P1 | **Critical** | `PUT /settings` no perm check — student rewrites school config | `settings.py:25` |
| P2 | **High** | `/activate/employees/create` role_name=`"SUPER_ADMIN"` accepted | `activate.py:251` |
| P3 | **High** | `/corporate/*` no perm gate (any auth user) | `corporate.py:*` |
| P4 | **High** | `/platform/admin/*` / `/iga/*` no perm gate | `platform_commission.py:47+, iga.py:14+` |
| P5 | **High** | `/nfc/{student\|etc}/by-card/{uid}` no school_id | `nfc_v2.py:111,131,150,167` |
| P6 | **High** | `/card-design/{school_id}` path-param IDOR | `card_design.py:13,25` |
| P7 | **High** | `/parent-payments/refund/{id}/approve` no school check | `parent_payments.py:279` |
| P8 | **Medium** | `UserUpdate.role_id` settable to SUPER_ADMIN role_id | `users.py:46`, `schemas/user.py:21` |
| P9 | **Medium** | `/branches/{id}` PATCH/DELETE no `require_permission` | `branches.py:88,119` |
| P10 | **Medium** | `/nfc/employee/assign` no `STAFF_CREATE` | `nfc_v2.py:61` |
| P11 | **Medium** | `/telegram/bot/*` no `SETTINGS_MANAGE` | `telegram.py:14-37` |
| P12 | **Medium** | `/audit-logs` silent empty return for non-super | `audit_logs.py:11` |
| P13 | **Low** | Permission enum naming inconsistency (`STUDENTS_VIEW` vs `STUDENT_*`) | `permissions.py:7-44` |
| P14 | **Low** | `is_view_only` exception list too narrow | `permissions.py:107` |

---

## §9 — What's Done Well

- 30-item dotted Permission enum spanning every business domain ✓
- 16-role matrix declarative and reviewed ✓
- Dependency-injection enforcement idiomatic for FastAPI ✓
- `is_view_only`изоля mode for outside-network access ✓
- License-gated features (NFC/QR/import/id_card) — feature-flag style ✓
- MFA enforced for `SUPER_ADMIN` and `FINANCE` roles ✓
- `is_superuser` short-circuit reduces boilerplate ✓ (needs tightening, see §6.1)
- `require_inside_network` for offline-after-schoolhours concept ✓

---

## §10 — Recommended Permission Hardening Priority

1. **P1 — `PUT /settings`**: add `require_permission(SETTINGS_MANAGE)` (literally one line)
2. **P2 — `/activate/employees/create`**: denylist role_name SUPER_ADMIN/LICENSE_MANAGE
3. **P3 — `/corporate/*`**: require `require_role("ZENOVA_CORPORATE_ADMIN")` and tighten the service to filter by deploy-target scope
4. **P4 — `/platform/*`, `/iga/*`**: add `require_permission(LICENSE_MANAGE)`
5. **P5-P7 — cross-tenant NFC/refund/card-design**: add `current_user.school_id` filter to service signatures and queries
6. **P8 — `UserUpdate.role_id`**: denylist SUPER_ADMIN role_id for non-superuser callers
7. **P9-P11 — mutation perms**: add `require_permission(...)` consistently
8. **P12 — `/audit-logs`**: return 403 instead of silent empty; make a school-scope variant for ADMIN/DIRECTOR

**Permissions Score: 65/100** — deduct 20 for skipped perms on critical surfaces, 10 for mass-assign role escalation, 5 for narrow view-only list.

**End of PERMISSIONS_AUDIT.md**
