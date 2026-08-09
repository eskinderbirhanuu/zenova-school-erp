# APU Implementation Plan

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE — phased build plan.
> Each phase ends with verification. Nothing in "Future cycles" is implemented yet.

## Phase 0 — Foundation (DONE)

| Item | Result |
|---|---|
| Control Center APU public API | resolve + config + branding endpoints, verified |
| License Server security | `role: school` tokens, HMAC heartbeat, tests |
| APU mobile app skeleton | boot → school → login → mfa → home → update, themed |
| MFA bootstrap for SUPER_ADMIN/FINANCE | setup→verify→backup codes, E2E verified |
| APU architecture docs | this doc set |

## Phase 1 — Parent & Student read path (MOBILE only) — DONE

Goal: parents/students can view their data from the phone. Requires **no backend change** for reads.

1. Token-refresh interceptor (Gap A1) + boot session validation (A2). **DONE** (`src/services/api.ts`, `App.tsx` boot).
2. CSRF helper attached to all mutating calls (A3). **DONE** (`getCsrfToken` in `src/services/api.ts`, used by `apiPost`).
3. Parent screens: dashboard (children, attendance%, grades, fees), invoices, receipts, pay flow. **DONE** (`src/screens/ParentPortal.tsx`).
4. Student screens: dashboard (attendance%, grades, schedule, assignments, wallet), assignments, exams. **DONE** (`src/screens/StudentPortal.tsx`).
5. Offline cache snapshots + freshness badge. **DONE** (`src/hooks/useCachedResource.ts`, `src/components/PortalScreen.tsx`).

**Verification:** `tsc --noEmit` clean; `expo export --platform android` bundles (919 modules). Live API verification still requires a licensed school backend with linked PARENT/STUDENT profiles.

## Phase 2 — Teacher path (MOBILE + one backend tidy)

1. Teacher screens: subjects, roster, timetable, take attendance (`/attendance/bulk`), fix a mark, marksheet view.
2. Gap T1 (roster section/subject filter) — backend query params.
3. Idempotency key on `/attendance/bulk` (Gap T3) to make replay safe.
4. Offline queue for attendance + replay loop (`APU_SYNC_ARCHITECTURE.md`).

**Verification:** teacher dry-run user marks attendance on LAN; queue drains after simulated reconnect; no duplicate marks (idempotency).

## Phase 3 — Notifications (BACKEND + MOBILE)

1. Backend: user-scoped read access for PARENT/STUDENT to `/notifications` + `/messages` (Gap N1) — ownership-scoped, not blanket permission.
2. Fix report-card ownership gate (P1) — security first.
3. MOBILE: notification inbox + deep links.
4. (Design) FCM device-token registration + relay (`APU_NOTIFICATIONS.md`).

**Verification:** parent/student receive own notifications only; report-card endpoint returns 404/403 for non-owners.

## Phase 4 — Local teacher mode (DESIGN decision first)

1. Resolve Gap R2 (LAN endpoint design): pick a mechanism from `APU_SCHOOL_RESOLUTION.md` §5.
2. Connectivity layer + local-first routing for TEACHER (`APU_NETWORK_ARCHITECTURE.md`).
3. Self-signed cert trust policy (R4).
4. mDNS or config-based discovery (R3).

**Verification:** teacher phone on school LAN hits the local server; same credentials work; offline grace honored.

## Phase 5 — Hardening & release

1. Gap A4/A5 decisions (optional MFA, self-registration).
2. Fix R1 (resolve error semantics).
3. Set `EXPO_PUBLIC_CONTROL_CENTER_URL` in CI; signed builds; version gates (`APU_DEPLOYMENT.md`).
4. Full test suite + Playwright/E2E + dry-run checklist extension.

## Future cycles (NOT implemented — must not be fabricated)

- Push notifications (Phase 3 split out), device/session management, backup, analytics, privacy/deep links, audit logs, deployment docs.
- Offline-first ERP beyond attendance queue (results entry offline stays gated by backend).

## Sequencing rules

1. **Protect core:** no backend/DB/deployment changes unless listed in a phase.
2. **Reuse before build:** each item maps to an existing endpoint; anything new is a recorded gap.
3. **Security first:** ownership-scoped access (N1) and report-card gate (P1) precede any UX expansion.
4. **Verify every phase** with dry-run users + tests before moving on.
