# APU Overview

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE — no implementation yet.
> This document answers the four questions: WHAT, WHY, HOW, WHAT-it-reuses.

## 1. WHAT are we building?

**APU** is a single mobile application for exactly three user types:

- **TEACHER**
- **PARENT**
- **STUDENT**

```
APU
|
+-- Teacher
+-- Parent
+-- Student
```

There is **ONE** application, **ONE** shared login, and **NO separate mobile app per role**. After authentication, the **backend-provided role** determines which dashboard and capabilities the user sees.

APU is a **mobile client** of the existing ZENOVA/Omega ecosystem. It is **not** a new ERP, **not** a new backend, **not** a new database.

## 2. WHY are we building it?

- Parents and students need a phone-accessible view of attendance, results, fees, and announcements without using the full web ERP.
- Teachers need to mark attendance and view their classes/students from a phone.
- Schools operate in **local**, **cloud**, or **hybrid** deployment. Teachers must work on the school **LAN even when the Internet is down**; parents and students connect over the **Internet** to the school's VPS.
- One shared app keeps distribution, updates, and support simple across every customer school.

## 3. HOW will it work?

```
APU
|
+-- School ID  ──────────► POST {Control Center}/api/v1/public/schools/resolve
|                            (branding + api_url + features)
|
+-- Username / User ID / Password ─► POST {school}/api/v1/auth/login
|
+-- Backend Authentication
|
+-- Backend determines role  (TEACHER | PARENT | STUDENT)
|
+-- Teacher Dashboard  |  Parent Dashboard  |  Student Dashboard
```

1. The user enters a **School ID** (a short code). The Control Center resolves it to the school's branding, public domain, feature flags, and — in future — a configurable **local endpoint** for LAN mode.
2. The user signs in against **that school's own ERP backend** using the common login (email or employee/user ID + password). The backend is the **single source of truth** for identity, role, and permissions — the client never supplies or trusts a client-claimed role.
3. The backend response (and token claims) determine the role. The app renders the matching dashboard and shows a "not supported on APU" state for any administrative role.

## 4. WHAT existing ZENOVA component will it reuse?

| Capability | Reused ZENOVA component |
|---|---|
| School lookup + branding | `control-center/backend` — `POST /api/v1/public/schools/resolve`, `GET /api/v1/public/config` |
| Authentication (login, refresh, MFA, logout) | `backend/app/api/v1/endpoints/auth.py` — `/auth/login`, `/auth/refresh`, `/auth/mfa/login`, `/auth/mfa/bootstrap/*`, `/auth/logout` |
| Authoritative profile | `GET /auth/me`, `GET /auth/me/employee-id` |
| Parent capabilities | `parent_portal.py`, `parent_payments.py` routers |
| Student capabilities | `student_portal.py` router (`/student-portal/dashboard`) |
| Teacher capabilities | `teachers.py` (`/teachers/me/*`), `academic.py` (`/timetable/by-teacher`, `/exam-results/marksheet`), `attendance.py` (`/attendance/bulk`) |
| Announcements | `announcements.py` (read routes) |
| Notifications | `communication.py` (preferences + `/notifications`) + WebSocket `/api/v1/ws/notifications?token=` |
| Deployment/licensing | `license-server/` (heartbeat + validation), `deploy/` modes (`school`/`cc`/`license`) |

## 5. Principles

1. **Protect the existing system** — no Web/backend/DB/deployment changes during this phase.
2. **Reuse before build** — every APU feature maps to an existing endpoint where one exists; missing capability is recorded as a gap.
3. **Backend is authoritative** — never trust a client-supplied role.
4. **One app, many schools** — never one codebase per school.
5. **No hard-coded IPs** — local endpoints must be configurable/discoverable per the existing ZENOVA deployment design.
6. **Offline-first for teachers, cloud-first for parents/students.**

## 6. Related documents

| Doc | Covers |
|---|---|
| `APU_ARCHITECTURE.md` | Layered app structure, components, tenancy |
| `APU_USER_ROLES.md` | Exact role set + per-role capabilities |
| `APU_AUTHENTICATION.md` | Auth/refresh/MFA/secure storage |
| `APU_SCHOOL_RESOLUTION.md` | School-ID → branding → endpoint flow |
| `APU_NETWORK_ARCHITECTURE.md` | Local / cloud / hybrid connectivity |
| `APU_API_INTEGRATION.md` | Endpoint inventory + reuse map |
| `APU_GAPS_AND_DEPENDENCIES.md` | Classified gap analysis |
| `APU_IMPLEMENTATION_PLAN.md` | Phased build plan |

## 7. Dependencies, Assumptions, Risks

- **Dependencies:** an active Control Center reachable by the app (`EXPO_PUBLIC_CONTROL_CENTER_URL`); a licensed school backend reachable at the resolved `api_url`; Expo SDK 57 toolchain.
- **Assumptions:** every APU school has a ZENOVA backend (local or VPS) already provisioned; PARENT/STUDENT accounts exist and are linked to profiles (`Parent.user_id`, `Student.user_id`); the backend remains authoritative.
- **Risks:** notifications 403 for PARENT/STUDENT (BACKEND GAP); CSRF required on mutating calls (MOBILE GAP); no LAN endpoint today (DESIGN/BACKEND GAP). See `APU_GAPS_AND_DEPENDENCIES.md`.
- **Unresolved questions:** how LAN endpoint discovery should be configured per school (env? branding? resolve response?); whether notifications permission should be relaxed or seeded for PARENT/STUDENT.
