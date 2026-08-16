# APU User Roles

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE.
> WHAT / WHY / HOW / WHAT-it-reuses for the APU role model.

## 1. WHAT are the roles?

APU supports **exactly three** user types:

```
APU
|
+-- Teacher
+-- Parent
+-- Student
```

**NOT in APU:** Director, Admin, Finance, HR, Cashier, Librarian, Nurse, Registrar, Auditor, Inventory, Cafeteria. Those administrative roles remain in the existing ZENOVA Web/Admin system.

## 2. WHY only three roles?

The APU product scope is the three people who interact with the school from a phone. Administrative roles already have full web access and are out of scope for the mobile app by design.

## 3. HOW does role determination work?

- **Backend is authoritative.** The client never supplies a role.
- `POST /api/v1/auth/login` returns `role_name` (backend-derived). The JWT access token also carries a `role` claim.
- After login the app calls `GET /api/v1/auth/me` (optional refresh of identity) to confirm the authoritative role and profile.
- The app renders the role dashboard **only** for `TEACHER`, `PARENT`, `STUDENT`. Any other role (e.g. `ADMIN`, `FINANCE`) sees a "APU is for teachers, parents and students — use the web portal" state and is signed out.

### Exact role strings (verified)

Source: `backend/app/services/license_service.py:338-342` (`DEFAULT_ROLES`) and `backend/app/core/permissions.py:60-112` (`ROLE_PERMISSIONS`).

| Role | Exists? | Notes |
|---|---|---|
| `TEACHER` | ✅ | Has permissions: `students.view`, `grades.enter`, `attendance.mark` |
| `PARENT` | ✅ | No default permissions in `ROLE_PERMISSIONS` → empty set |
| `STUDENT` | ✅ | No default permissions in `ROLE_PERMISSIONS` → empty set |

> ⚠️ **Known gap:** PARENT and STUDENT have **empty default permission sets**. Any endpoint gated by `require_permission(...)` will 403 for them unless the school seeds DB `role_permissions` rows. This affects `/notifications` + `/messages` (see `APU_GAPS_AND_DEPENDENCIES.md`). Preferences and portal endpoints (which use `get_current_user` + profile-link checks) work fine.

## 4. Role-specific capabilities

Each item below is marked **REUSE** (existing endpoint) or **BACKEND GAP** (does not exist).

### TEACHER
| Capability | Status | Endpoint (reuse) |
|---|---|---|
| Dashboard | REUSE | `/dashboard/overview` (generic) or teacher-specific aggregates |
| My Subjects | REUSE | `GET /api/v1/teachers/me/subjects` |
| My Profile | REUSE | `GET /api/v1/teachers/me/profile`, `PATCH /api/v1/teachers/me` |
| My Students | REUSE | `GET /api/v1/teachers/me/students` |
| My Timetable / Classes | REUSE | `GET /api/v1/timetable/by-teacher` |
| Take Attendance | REUSE | `POST /api/v1/attendance/bulk` (needs `attendance.mark`; 08:00–10:00 ET window), `PATCH /api/v1/attendance/{id}` |
| Enter / View Results | REUSE | `GET /api/v1/exam-results/marksheet?subject_id=&section_id=` |
| Announcements | REUSE | `GET /api/v1/announcements` |
| Notifications | REUSE (TEACHER has `students.view`) | `GET /api/v1/notifications` + WS |
| Profile | REUSE | `/auth/me` |

### PARENT
| Capability | Status | Endpoint (reuse) |
|---|---|---|
| Dashboard (children) | REUSE | `GET /api/v1/parent-portal/dashboard` |
| My Children (list) | REUSE | part of `parent-portal/dashboard` |
| Child Attendance | REUSE | `parent-portal/dashboard` → `attendance_pct` (summary only) |
| Child Academic Results | REUSE | `parent-portal/dashboard` → `grades[]` (top 20) |
| Assignments / Exams | REUSE (partial) | `GET /api/v1/assignments?section_id=`, `GET /api/v1/exams` |
| Fees / Finance | REUSE | `GET /api/v1/parent-payments/dashboard`, `/invoices`, `POST /api/v1/parent-payments/create-session`, `/chapa/initialize`, `/receipts` |
| Announcements | REUSE | `GET /api/v1/announcements` |
| Notifications | BACKEND GAP | 403 — PARENT has no permission (see gaps) |
| Documents | BACKEND GAP | student documents exist but no parent-facing read endpoint |
| Profile | REUSE | `/auth/me` |

### STUDENT
| Capability | Status | Endpoint (reuse) |
|---|---|---|
| Dashboard | REUSE | `GET /api/v1/student-portal/dashboard` |
| My Profile | REUSE | `/auth/me` |
| My Attendance | REUSE | `student-portal/dashboard` → `attendance_pct` + day counts |
| My Academic Results | REUSE | `student-portal/dashboard` → `subject_grades[]` |
| My Assignments | REUSE | `GET /api/v1/assignments?section_id=` |
| My Exams | REUSE | `GET /api/v1/exams` |
| Fees / Finance | **BACKEND GAP** | student portal exposes only `wallet_balance`; no invoice/payment history |
| Announcements | REUSE | `GET /api/v1/announcements` |
| Notifications | BACKEND GAP | 403 — STUDENT has no permission |
| Documents | BACKEND GAP | no student-facing document read endpoint |
| Profile | REUSE | `/auth/me` |

## 5. Account provisioning

- APU **does not create accounts**. Accounts are provisioned in the existing web/ERP system.
- `POST /api/v1/auth/register` self-registration is restricted to `SAFE_SELF_REGISTER_ROLES = {"PARENT", "STUDENT"}` — **decision (2026-08-09): APU keeps it disabled.** Admin-provisioned accounts are the enrollment control; see `APU_GAPS_AND_DEPENDENCIES.md` A5.
- A user can log in only if:
  - `User.is_active` and not soft-deleted,
  - PARENT: a `Parent` row has `user_id == current_user.id` (`get_parent_for_user()`),
  - STUDENT: a `Student` row has `user_id == current_user.id`,
  - TEACHER: a `TeacherProfile` row has `user_id == current_user.id` (unique).

## 6. Dependencies / assumptions / risks

- **Dependencies:** role → permission mapping must be seeded for PARENT/STUDENT if notifications are required; profile links (`Parent.user_id`, `Student.user_id`) must be populated for the school.
- **Assumptions:** the login response's `role_name` is the authoritative role; schools seed the exact `DEFAULT_ROLES` names.
- **Risks:** if a school grants extra roles (e.g. `ADMIN`) to a user, APU must gate the UI to the three supported roles.
