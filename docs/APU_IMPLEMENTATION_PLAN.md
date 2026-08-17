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

## Phase 3 — Notifications (BACKEND + MOBILE) — DONE

1. Backend: user-scoped read access for PARENT/STUDENT to `/notifications` + `/messages` (Gap N1) — ownership-scoped, not blanket permission. **DONE** (`communication.py` `AUTHENTICATED` gate, `test_phase3_security.py`).
2. Fix report-card ownership gate (P1) — security first. **DONE** (`report_cards.py` `_resolve_accessible_student_ids`/`_require_card_access`).
3. MOBILE: notification inbox + deep links. **DONE** (inbox: `NotificationsScreen.tsx` tabs Notifications/Messages, unread dots, mark-read/mark-all). **Deep links DONE** (2026-08-10): tapping a notification opens the relevant destination — `message`→Messages tab, `invoice_created`→Parent invoices/Student finance, `exam_results`→Student exams/Teacher marksheet/Parent dashboard, `attendance`→Student dashboard/Teacher attendance, `student_enrolled`→Student dashboard. Pure resolver `mobile-app/src/services/deepLink.ts` (17 node assertions) + `resolvePushTarget` for FCM push taps (expo-notifications response listener in `App.tsx`); portals accept an `initialView`/`initialTab`. Mobile-only — no backend change.
4. (Design) FCM device-token registration + relay (`APU_NOTIFICATIONS.md`). **DONE** (2026-08-09) — Gap N2 closed: `push_devices` table + `push_on` pref (migration `e5f6a7b8c9d0`), `/notifications/device-token*` feature-gated by `FEATURE_PUSH`, `fcm_relay.py` (best-effort HTTP v1, token prune), mobile `push.ts` registers/unregisters on sign-in/sign-out. See `APU_GAPS_AND_DEPENDENCIES.md` N2.

**Verification:** parent/student receive own notifications only; report-card endpoint returns 404/403 for non-owners. `test_phase3_security.py` 15/15 + `test_fcm_push.py` 18/18; full backend suite **521 passed**; `tsc --noEmit` clean; `expo export` bundles (991 modules).

## Phase 4 — Local teacher mode (DESIGN decision first)

1. Resolve Gap R2 (LAN endpoint design): pick a mechanism from `APU_SCHOOL_RESOLUTION.md` §5. **DONE** — resolve-driven `local_url` + SecureStore manual override implemented (CC `Customer.local_url`, mobile `pickBaseUrl`/`probeLocalEndpoint`, `zenova.localUrl.<code>`).
2. Connectivity layer + local-first routing for TEACHER (`APU_NETWORK_ARCHITECTURE.md`).
3. Self-signed cert trust policy (R4). **DESIGN DONE** — `APU_CERT_TRUST_POLICY.md` (tiers 1–3, per-school SPKI pinning, no global trust-all). Implementation is a future native networking task (checklist in §7).
4. mDNS or config-based discovery (R3). **DONE** — resolve field + manual override chosen; mDNS deferred.

**Verification:** teacher phone on school LAN hits the local server; same credentials work; offline grace honored.

## Phase 5 — Hardening & release

1. Gap A4/A5 decisions (optional MFA, self-registration). **A4 DONE** — Security screen in APU (`SecurityScreen.tsx`) enables/disables MFA for TEACHER/PARENT/STUDENT; backend already supported it (endpoints require only `get_current_user`). **A5 DECIDED — defer self-registration** (admin-provisioned accounts are the enrollment control; no `school_id` in resolve; see `APU_GAPS_AND_DEPENDENCIES.md` A5).
2. Fix R1 (resolve error semantics). **DONE** — `ResolveResult.kind` + `SchoolSelectScreen` messaging.
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
