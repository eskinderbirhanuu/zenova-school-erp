# APU API Integration

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE.
> Inventory of the existing ZENOVA API surface and how APU (TEACHER/PARENT/STUDENT) reuses it.
> Verified against `backend/app/api/v1/router.py` and endpoint files. Base prefix: `/api/v1`.

## Auth (all reuse — `auth.py`)

| Method + Path | Auth | APU reuse |
|---|---|---|
| POST `/auth/login` | public | ✅ login (email or employee_id) |
| POST `/auth/refresh` | public (refresh token) | ✅ token refresh |
| POST `/auth/mfa/login` | mfa_token | ✅ 2FA complete |
| POST `/auth/mfa/bootstrap/setup` | mfa_token | ✅ MFA setup (pending login) |
| POST `/auth/mfa/bootstrap/verify` | mfa_token | ✅ returns 10 backup codes |
| POST `/auth/logout` | bearer + CSRF | ✅ sign out (CSRF needed) |
| GET `/auth/me`, `/auth/me/employee-id` | bearer | ✅ authoritative profile/roles |
| GET `/auth/csrf-token` | public (exempt) | ✅ required before mutating calls |
| POST `/auth/forgot-password`, `/auth/reset-password` | public (exempt) | ✅ forgot/reset |
| POST `/auth/register` | public | ⚠️ restricted to PARENT/STUDENT; future decision |

## Parent (all reuse — `parent_portal.py`, `parent_payments.py`)

| Method + Path | Auth | APU reuse |
|---|---|---|
| GET `/parent-portal/dashboard` | bearer | ✅ children + attendance% + grades(≤20) + fees(≤10) |
| GET `/parent-portal/invoices` | bearer | ✅ |
| POST `/parent-portal/payments` | bearer + CSRF | ✅ pay (auto idempotency key) |
| GET `/parent-payments/dashboard` | bearer | ✅ outstanding/paid/history |
| GET `/parent-payments/invoices` | bearer | ✅ pending/partial/overdue |
| POST `/parent-payments/create-session` | bearer + CSRF | ✅ start online payment |
| POST `/parent-payments/chapa/initialize` | bearer + CSRF | ✅ (gated `FEATURE_CHAPA`) |
| POST `/parent-payments/chapa/webhook` | public (HMAC) | ❌ gateway callback |
| GET `/parent-payments/receipts` + `/{id}/download` | bearer | ✅ |
| POST `/parent-payments/refund/request` | bearer + CSRF | ✅ |
| POST `/parent-payments/refund/{id}/approve|process` | FINANCE_ENTRY | ❌ admin |

## Student (reuse + one gap — `student_portal.py`)

| Method + Path | Auth | APU reuse |
|---|---|---|
| GET `/student-portal/dashboard` | bearer | ✅ attendance%, subject grades, today's schedule, upcoming assignments, wallet balance |
| Fees/invoices for student | — | ❌ **BACKEND GAP** (only wallet balance exists) |

## Teacher (reuse — `teachers.py`, `academic.py`, `attendance.py`)

| Method + Path | Auth | APU reuse |
|---|---|---|
| GET `/teachers/me/subjects` | bearer | ✅ |
| GET `/teachers/me/profile` | bearer | ✅ |
| PATCH `/teachers/me` | bearer | ✅ self-edit |
| GET `/teachers/me/students` | bearer | ✅ roster (gap: no section/subject filter) |
| GET `/timetable/by-teacher` | bearer | ✅ own timetable |
| POST `/attendance/bulk` | `attendance.mark` (TEACHER has it) + CSRF | ✅ take attendance (08:00–10:00 ET window) |
| PATCH `/attendance/{id}` | `attendance.mark` + CSRF | ✅ fix a mark |
| GET `/attendance` | bearer | ✅ read marks |
| GET `/exam-results/marksheet?subject_id=&section_id=` | bearer | ✅ class marksheet |
| POST `/exam-results/bulk` | `students.create` | ❌ entry gated to admins |

## Shared reads (reuse — `academic.py`, `announcements.py`, `communication.py`)

| Method + Path | Auth | APU reuse |
|---|---|---|
| GET `/academic-years`, `/semesters`, `/classes`, `/sections`, `/subjects`, `/classrooms` | bearer | ✅ reference data |
| GET `/timetable?section_id=` | bearer | ✅ section timetable |
| GET `/exams?class_id=&subject_id=` | bearer | ✅ |
| GET `/exam-results?exam_id=` | bearer | ✅ |
| GET `/assignments?section_id=` | bearer | ✅ |
| GET `/announcements` (+ `/{id}`) | bearer | ✅ published only |
| GET `/report-cards` + `/generate` + `/{id}` | bearer | ✅ read/generate (⚠️ no ownership gate — SECURITY GAP) |
| GET `/schools/me` | bearer | ✅ school info |
| GET `/config/features` | public | ✅ feature flags (`{chapa:bool}`) |

## Notifications & messages (`communication.py`)

| Method + Path | Auth | APU reuse |
|---|---|---|
| GET `/notifications`, POST `/notifications/{id}/read`, `/read-all` | `ALL` perms | ⚠️ **403 for PARENT/STUDENT** (no perms) — BACKEND GAP |
| POST `/messages`, GET `/messages`, `/messages/{id}/read` | `ALL` perms | ⚠️ same 403 gap |
| GET/PUT `/notifications/preferences` | bearer | ✅ all roles |

## WebSocket (`ws.py`)

| Endpoint | Auth | APU reuse |
|---|---|---|
| WS `/api/v1/ws/notifications?token=<access JWT>` | query-param access JWT | ✅ push notifications (teacher; parent/student once the 403 gate is resolved — server pushes only to authorized users) |
| WS `/api/v1/ws/nfc-scans?token=<jwt>` | query-param access JWT | ⚠️ broadcast — marginal |

## Dashboard (all roles — `dashboard.py`)

| Method + Path | Auth | APU reuse |
|---|---|---|
| GET `/dashboard/overview` | bearer | ✅ but **not personalized** (school aggregates for every role) — prefer role portals |
| GET `/dashboard/trends?months=` | bearer | ⚠️ school-wide trends |

## Server infrastructure (NOT for APU)

- `/sync/*` (status/queue/trigger/retry/purge/receive) — server↔server; mobile sync is a future design.
- `/health/live`, `/health/ready` — connectivity probes (APU uses `/health/live`).
- Admin-only routers (`/students`, `/parents`, `/teachers` write routes, `/finance`, `/hr`, `/inventory`, `/library`, `/cafeteria`, `/users`, `/branches`, `/audit`, `/licenses`, `/installer`, `/setup`, `/backup`, etc.) — **not** APU surface.

## Summary: APU reuse map

| Capability | Endpoint(s) | Reuse |
|---|---|---|
| Auth + refresh + MFA | `/auth/*` | ✅ |
| Parent dashboard/fees/pay | `/parent-portal/*`, `/parent-payments/*` | ✅ |
| Student dashboard | `/student-portal/dashboard` | ✅ (+ fee gap) |
| Teacher roster/timetable/attendance/marksheet | `/teachers/me/*`, `/timetable/by-teacher`, `/attendance/bulk`, `/exam-results/marksheet` | ✅ |
| Announcements | `/announcements` | ✅ |
| Notifications | `/notifications` + WS | ⚠️ PARENT/STUDENT 403 |
| Reference data | `/academic/*`, `/classes`, `/sections`, `/subjects` | ✅ |
| School info | `/schools/me` | ✅ |
