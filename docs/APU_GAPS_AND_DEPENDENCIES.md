# APU Gaps & Dependencies

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE.
> Classified gaps (backend, mobile, design) and dependencies blocking APU production readiness.

## 1. Classification legend

| Label | Meaning |
|---|---|
| **BACKEND GAP** | Requires a change in `backend/` (or Control Center / License Server). |
| **MOBILE GAP** | Requires a change in `mobile-app/` (client-side only). |
| **DESIGN GAP** | Needs a product/architecture decision before implementation. |
| **DONE** | Closed (verified by test or dry-run). |

## 2. Authentication

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| A1 | Token-refresh interceptor | MOBILE | `refreshSession` exists in `mobile-app/src/services/auth.ts`; wired into `apiGet`/`apiPost` in `mobile-app/src/services/api.ts` (auto-refresh + retry on 401, SessionExpiredError on failure). | DONE |
| A2 | Boot session validation | MOBILE | App boot validates stored token via `GET /auth/me` (`validateSession`); on expiry signs out, on unreachable backend keeps the cached session (offline-first). | DONE |
| A3 | CSRF token helper | MOBILE | `getCsrfToken()` fetches `/auth/csrf-token`, caches it per school, and `apiPost` sends `X-CSRF-Token` header + matching `csrf_token` cookie on every mutating call. | DONE |
| A4 | MFA optional for APU roles | DESIGN | TEACHER/PARENT/STUDENT can enable MFA voluntarily via a Security screen. Backend already allowed it (endpoints only require `get_current_user`). | DONE |
| A5 | PARENT/STUDENT self-registration | DESIGN | `/auth/register` allows `SAFE_SELF_REGISTER_ROLES` — enabling in APU is undecided. | DECIDED — DEFER (2026-08-09): APU keeps self-registration OFF. Admin-provisioned accounts are the enrollment control (`Parent.user_id`/`Student.user_id` links). Two blockers: (1) no enrollment binding — a self-registered account is inert until an admin links it, yet burns a user row + email with no verification; (2) no `school_id` in the resolve payload, so APU cannot scope a new account to the resolved school. Future path (when wanted): admin-issued enrollment/invite code binding the new account to an existing Parent/Student profile + add `school_id` to resolve. |
| A6 | MFA bootstrap in APU | DONE | `MFAScreen.tsx` implements setup→verify→backup codes; backend endpoints exist + E2E-verified. | DONE |

## 3. Notifications & messages

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| N1 | PARENT/STUDENT 403 on `/notifications` + `/messages` | BACKEND | `require_permission("ALL")` gates these; PARENT/STUDENT have empty permission sets. Fix: allow user-scoped reads (`Notification.user_id == current_user.id`), or seed `role_permissions`. | DONE — read endpoints (list/read/read-all for notifications + messages) switched to an `AUTHENTICATED` gate; writes stay permission-gated (`communication.py`, `test_phase3_security.py`). |
| N2 | Push channel (FCM/APNs) | DESIGN+MOBILE+BACKEND | No device-token registration endpoint, no FCM relay. Design in `APU_NOTIFICATIONS.md`. | **DONE** (2026-08-09) — Backend: `POST/GET/DELETE /notifications/device-token*` (feature-gated by `FEATURE_PUSH`), `push_devices` table + `notification_preferences.push_on` (migration `e5f6a7b8c9d0`), best-effort FCM HTTP v1 relay (`app/services/fcm_relay.py`, OAuth2 service-account JWT, respects prefs, prunes `UNREGISTERED` tokens), relay wired into `send_notification`. Mobile: `expo-notifications` + `expo-device` installed, `mobile-app/src/services/push.ts` (register on sign-in/boot, unregister on sign-out/switch-school, permission + Android channel, feature-flag aware via `/config/features`), `apiDelete` helper. Tests: `backend/tests/test_fcm_push.py` (18 tests); full backend suite **521 passed**. Deploy requires FCM project + service account (`FCM_PROJECT_ID`/`FCM_CREDENTIALS_JSON`). APNs registration on iOS is best-effort via `getDevicePushTokenAsync`. |
| N3 | WS push for parent/student | BACKEND | Same 403 as N1 blocks WebSocket delivery to PARENT/STUDENT. | **DONE** (2026-08-09) — WS endpoint is token-only (`ws.py`, no permission gate) and `send_notification` fans out via `notification_manager.push` keyed by recipient `user_id` (role-agnostic). N1 unblocked the read side. Covered by `backend/tests/test_phase3_security.py::TestN3WsPushForAllRoles` (4 tests: parent push payload, non-fatal push failure, token-only WS accepts any role, invalid token → 4001). |
| N4 | Preferences API | DONE | `/notifications/preferences` works for all roles. | DONE |
| N5 | Mobile notification inbox | MOBILE | In-app inbox with Notifications/Messages tabs, unread dots, tap-to-mark-read, mark-all-read. Uses N1 user-scoped endpoints. Wired to `featureMessages` for PARENT/STUDENT/TEACHER. | DONE (`mobile-app/src/screens/NotificationsScreen.tsx` + `services/notifications.ts`, Phase 3, 2026-08-09) |
| S3 | Student mobile finance/documents tabs | MOBILE | StudentPortal gained Finance (invoices+lines, payment history, wallet, totals) and Documents tabs using S1/S2 endpoints. | DONE (`mobile-app/src/screens/StudentPortal.tsx` + `services/student.ts`, 2026-08-09) |

## 4. Finance (Parent)

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| F1 | Parent payments router registration | BACKEND | `parent_payments` router was never registered — fixed in `67a8e6e` (`router.py:53`). | DONE |
| F2 | Parent profile resolution | BACKEND | `User.parent_id` did not exist — fixed via `get_parent_for_user()` (`Parent.user_id == current_user.id`). | DONE |
| F3 | Chapa gating | DONE | `FEATURE_CHAPA` env gates `/parent-payments/chapa/*`; disabled shows "Coming Soon" per policy. | DONE |

## 5. Student

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| S1 | Student fee/invoice history | BACKEND | `student-portal/dashboard` exposes only `wallet_balance`. No student invoice/payment/receipt endpoint. | DONE — `GET /student-portal/finance` returns own invoices (with lines), payment history, wallet balance + totals (`student_portal.py`, `test_student_portal_finance_docs.py`). |
| S2 | Student documents read | BACKEND | No student-facing document endpoint. | DONE — `GET /student-portal/documents` returns own document metadata (read-only, ownership-scoped via `Student.user_id`) (`student_portal.py`, `test_student_portal_finance_docs.py`). |

## 6. Teacher

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| T1 | Roster section/subject filter | BACKEND | `GET /teachers/me/students` returns all assigned students with no section/subject query. | DONE (`test_teacher_phase2.py`) |
| T2 | Offline attendance window | DESIGN | `POST /attendance/bulk` enforces 08:00–10:00 ET; queued offline marks must be re-checked server-side on replay. | DONE — window re-checked server-side on every `/attendance/bulk` replay (same window check runs per request). |
| T3 | Idempotency on `/attendance/bulk` | BACKEND | Sync design assumes `X-Idempotency-Key` support; only payments have it today. | DONE — `AttendanceBatch` + `X-Idempotency-Key` (migration `12ab34cd56ef`, `test_teacher_phase2.py`). |
| T4 | Fix-a-mark UX | BACKEND+MOBILE | Teacher corrects a wrong attendance status. `PATCH /attendance/{id}` existed; `GET /attendance` now accepts `section_id` and returns `student_name`; mobile `AttendanceView` gained a Fix-a-mark mode. | DONE (Phase 3, 2026-08-09) |

## 7. School resolution & network

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| R1 | `resolve` network error vs not-found | MOBILE | `resolveSchool` returns `found:false` on transport failure too — mislabels network error as "school not found". | DONE — `ResolveResult.kind` now distinguishes `found`/`not_found`/`network`/`config`/`invalid`; `SchoolSelectScreen` shows a network/config message instead of "school not found" (`resolve.ts`, Phase 3, 2026-08-09). |
| R2 | LAN endpoint per school | DESIGN+BACKEND | No `local_url`/`lan_url` returned by resolve. | DONE — `Customer.local_url` + `local_url_label` (idempotent `ALTER TABLE` in CC `init_db`); resolve returns both; mobile `pickBaseUrl()`/`probeLocalEndpoint()` (probe `/api/v1/health/live`, 2s) with SecureStore per-school manual override (`zenova.localUrl.<code>`). See `APU_SCHOOL_RESOLUTION.md` §5. |
| R3 | LAN discovery mechanism | DESIGN | mDNS vs config vs resolve field — undecided. | DONE — resolve field + manual override chosen; mDNS deferred. |
| R4 | Self-signed LAN cert trust | DESIGN | Documented trust policy needed; never disable TLS validation app-wide. | DONE — `APU_CERT_TRUST_POLICY.md` (2026-08-09): tiers 1–3 (public cert → per-school SPKI pinning → explicit HTTP on trusted LAN), TOFU fingerprint confirmation, scope boundaries (cloud always OS-validated, pinning per-host only), rejected anti-patterns (no global trust-all, no silent downgrade). Design doc only — implementation checklist in §7. |
| R5 | `EXPO_PUBLIC_CONTROL_CENTER_URL` empty | MOBILE/CI | Must be set at build time (CI secret). | OPEN |

## 8. Reports / security

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| P1 | Report-card ownership gate | BACKEND | `GET /report-cards`, `/generate`, `/{id}` lack ownership checks (any authenticated user can read others' report cards). | DONE — `_resolve_accessible_student_ids()` + `_require_card_access()`; staff (STUDENT_VIEW) unrestricted, otherwise student-self + linked-parent scoped; generate requires staff permission (`report_cards.py`, `test_phase3_security.py`). |
| P2 | School-scoped session cap | DONE | Redis enforces max 5 concurrent sessions per user. | DONE |

## 9. Dependencies (must exist before APU launch)

- Control Center reachable (`EXPO_PUBLIC_CONTROL_CENTER_URL`) and schools registered as active customers.
- School ERP backend licensed + deployed (local or VPS).
- PARENT/STUDENT profiles linked (`Parent.user_id`, `Student.user_id`).
- (Push) FCM project + per-school or central relay.

## 10. Assumptions & risks

- **Assumptions:** schools keep the exact `DEFAULT_ROLES` names; role→permission seeding is a school action; CSRF exemption list unchanged.
- **Risks:** relaxing N1 could expose other users' notifications if ownership checks are wrong — fix must scope reads per user, not grant blanket permissions. Self-registration (A5) stays OFF — enabling it without enrollment control (admin profile linking) could create unauthorized accounts.
