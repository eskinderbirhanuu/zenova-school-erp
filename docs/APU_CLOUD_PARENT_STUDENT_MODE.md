# APU Cloud Parent / Student Mode

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE.
> WHAT / WHY / HOW / WHAT-it-reuses for the cloud-connected Parent and Student paths.

## 1. WHAT are we building?

The **cloud-first** connection paths for PARENT and STUDENT. Their phones reach the school's **VPS** (or cloud-hosted) ZENOVA backend over the Internet — they are **never forced onto the school LAN**.

```
Parent Phone ──► Internet ──► School/Omega VPS ──► ZENOVA API
Student Phone ─► Internet ──► School/Omega VPS ──► ZENOVA API
```

## 2. WHY

- Parents and students are typically off-campus; their only route is the cloud endpoint.
- The existing policy already states "Parent Portal and Student Portal are cloud only".
- The school VPS hosts the same `/api/v1` surface as the LAN server.

## 3. HOW it works

### 3.1 Base URL
- `cloud_url` = the resolved `api_url` (`https://{domain}`) from `POST /public/schools/resolve`.
- Parent/Student routing **always prefers cloud_url** and never requires a LAN endpoint.

### 3.2 Parent flows (verified endpoints)
| Action | Endpoint |
|---|---|
| Dashboard (children + attendance% + grades + fees) | `GET /api/v1/parent-portal/dashboard` |
| Invoices | `GET /api/v1/parent-portal/invoices`, `GET /api/v1/parent-payments/invoices` |
| Fee summary + history | `GET /api/v1/parent-payments/dashboard` |
| Pay | `POST /api/v1/parent-portal/payments` or `POST /api/v1/parent-payments/create-session` (+ `chapa/initialize`, gated by `FEATURE_CHAPA`) |
| Receipts | `GET /api/v1/parent-payments/receipts` (+ PDF download) |
| Refunds | `POST /api/v1/parent-payments/refund/request` |
| Announcements | `GET /api/v1/announcements` |

### 3.3 Student flows (verified)
| Action | Endpoint |
|---|---|
| Dashboard (attendance%, subject grades, today's schedule, upcoming assignments, wallet balance) | `GET /api/v1/student-portal/dashboard` |
| Assignments | `GET /api/v1/assignments?section_id=` |
| Exams | `GET /api/v1/exams` |
| Announcements | `GET /api/v1/announcements` |
| Profile | `GET /auth/me` |

### 3.4 Offline behavior (cloud roles)
- Light caching only: dashboard snapshots, announcements, results — refreshed on reconnect.
- **No offline writes** required for Parent/Student (payments require the online payment gateway anyway).
- If offline, show cached data with a "last updated" timestamp and a retry affordance.

## 4. Security for cloud mode

- TLS required (`https://`). Never send credentials over plain HTTP on public networks.
- Refresh tokens stored only in SecureStore; rotated via `/auth/refresh`.
- Payments go through the school backend → Chapa gateway (webhook validated by `X-Chapa-Signature`); the app never handles card data.
- WebSocket notifications over TLS (`wss://`).

## 5. WHAT it reuses

| Piece | Reused from |
|---|---|
| Parent portal | `backend/app/api/v1/endpoints/parent_portal.py`, `parent_payments.py` |
| Student portal | `backend/app/api/v1/endpoints/student_portal.py` |
| Cloud hosting | `deploy.sh school` on the VPS |

## 6. Dependencies / assumptions / risks / unresolved

- **Dependencies:** VPS reachable over HTTPS; school backend licensed (45-day offline grace protects the school, not the phone).
- **Assumptions:** parent/student accounts are linked (`Parent.user_id`, `Student.user_id`); `parent_payments` router is registered (verified in `router.py:53`).
- **Risks:** stale cached results shown as current — must display freshness; Chapa gated by `FEATURE_CHAPA`.
- **Unresolved:** whether students should see their own fee/invoice history (currently **BACKEND GAP** — student portal only exposes wallet balance).
