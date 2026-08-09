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
| A4 | MFA optional for APU roles | DESIGN | Whether TEACHER/PARENT/STUDENT should be able to enable MFA voluntarily (today only SUPER_ADMIN/FINANCE are forced). | OPEN |
| A5 | PARENT/STUDENT self-registration | DESIGN | `/auth/register` allows `SAFE_SELF_REGISTER_ROLES` — enabling in APU is undecided. | OPEN |
| A6 | MFA bootstrap in APU | DONE | `MFAScreen.tsx` implements setup→verify→backup codes; backend endpoints exist + E2E-verified. | DONE |

## 3. Notifications & messages

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| N1 | PARENT/STUDENT 403 on `/notifications` + `/messages` | BACKEND | `require_permission("ALL")` gates these; PARENT/STUDENT have empty permission sets. Fix: allow user-scoped reads (`Notification.user_id == current_user.id`), or seed `role_permissions`. | OPEN |
| N2 | Push channel (FCM/APNs) | DESIGN+MOBILE+BACKEND | No device-token registration endpoint, no FCM relay. Design in `APU_NOTIFICATIONS.md`. | OPEN |
| N3 | WS push for parent/student | BACKEND | Same 403 as N1 blocks WebSocket delivery to PARENT/STUDENT. | OPEN |
| N4 | Preferences API | DONE | `/notifications/preferences` works for all roles. | DONE |

## 4. Finance (Parent)

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| F1 | Parent payments router registration | BACKEND | `parent_payments` router was never registered — fixed in `67a8e6e` (`router.py:53`). | DONE |
| F2 | Parent profile resolution | BACKEND | `User.parent_id` did not exist — fixed via `get_parent_for_user()` (`Parent.user_id == current_user.id`). | DONE |
| F3 | Chapa gating | DONE | `FEATURE_CHAPA` env gates `/parent-payments/chapa/*`; disabled shows "Coming Soon" per policy. | DONE |

## 5. Student

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| S1 | Student fee/invoice history | BACKEND | `student-portal/dashboard` exposes only `wallet_balance`. No student invoice/payment/receipt endpoint. | OPEN |
| S2 | Student documents read | BACKEND | No student-facing document endpoint. | OPEN |

## 6. Teacher

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| T1 | Roster section/subject filter | BACKEND | `GET /teachers/me/students` returns all assigned students with no section/subject query. | OPEN |
| T2 | Offline attendance window | DESIGN | `POST /attendance/bulk` enforces 08:00–10:00 ET; queued offline marks must be re-checked server-side on replay. | OPEN |
| T3 | Idempotency on `/attendance/bulk` | BACKEND | Sync design assumes `X-Idempotency-Key` support; only payments have it today. | OPEN |

## 7. School resolution & network

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| R1 | `resolve` network error vs not-found | MOBILE | `resolveSchool` returns `found:false` on transport failure too — mislabels network error as "school not found". | OPEN |
| R2 | LAN endpoint per school | DESIGN+BACKEND | No `local_url`/`lan_url` returned by resolve. Candidate designs in `APU_SCHOOL_RESOLUTION.md` §5. | OPEN |
| R3 | LAN discovery mechanism | DESIGN | mDNS vs config vs resolve field — undecided. | OPEN |
| R4 | Self-signed LAN cert trust | DESIGN | Documented trust policy needed; never disable TLS validation app-wide. | OPEN |
| R5 | `EXPO_PUBLIC_CONTROL_CENTER_URL` empty | MOBILE/CI | Must be set at build time (CI secret). | OPEN |

## 8. Reports / security

| # | Gap | Class | Detail | Status |
|---|---|---|---|---|
| P1 | Report-card ownership gate | BACKEND | `GET /report-cards`, `/generate`, `/{id}` lack ownership checks (any authenticated user can read others' report cards). | OPEN |
| P2 | School-scoped session cap | DONE | Redis enforces max 5 concurrent sessions per user. | DONE |

## 9. Dependencies (must exist before APU launch)

- Control Center reachable (`EXPO_PUBLIC_CONTROL_CENTER_URL`) and schools registered as active customers.
- School ERP backend licensed + deployed (local or VPS).
- PARENT/STUDENT profiles linked (`Parent.user_id`, `Student.user_id`).
- (Push) FCM project + per-school or central relay.

## 10. Assumptions & risks

- **Assumptions:** schools keep the exact `DEFAULT_ROLES` names; role→permission seeding is a school action; CSRF exemption list unchanged.
- **Risks:** relaxing N1 could expose other users' notifications if ownership checks are wrong — fix must scope reads per user, not grant blanket permissions; enabling self-registration (A5) without enrollment control could create unauthorized accounts.
