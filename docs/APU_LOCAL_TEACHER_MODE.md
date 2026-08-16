# APU Local Teacher Mode

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE — design only, **not implemented**.
> WHAT / WHY / HOW / WHAT-it-reuses for the teacher LAN requirement.

## 1. WHAT are we building?

The **teacher-first local network path**: a teacher's phone on the school Wi-Fi/LAN talks to the **school's local ZENOVA server** (an old PC / Ubuntu server) and its local database — **even with no Internet**.

```
Teacher Phone
   │
   │  School Wi-Fi / LAN
   ▼
Old PC / Ubuntu Local Server
   │
   ▼
ZENOVA Local API  →  Local Database
```

Teacher phone: `192.168.x.x` · Local server: `192.168.x.x` (configurable — **never hard-coded**).

## 2. WHY

- The Internet at a school is often unreliable or absent during classes.
- Attendance marking, roster views, and result entry must keep working locally.
- The **local server must remain the source of operational service** while the school is offline.

## 3. HOW it works (design)

### 3.1 Endpoint selection
- On School resolution, the app learns `cloud_url` (from resolve `api_url`) and, when configured, `local_url`.
- `local_url` source (design decided 2026-08-09 — see `APU_SCHOOL_RESOLUTION.md` §5):
  1. **Primary:** a `local_url` field added to Control Center `Customer` and returned by resolve,
  2. **Fallback:** a per-school manual override stored in SecureStore (set in `SchoolSelectScreen`),
  3. mDNS/Bonjour discovery (`_zenova._tcp`) — **deferred**, not implemented.
- **Configurable/discoverable, never a single hard-coded IP.**
- The app only trusts `local_url` from resolve or the explicit manual override — never an arbitrary LAN host with stored cloud credentials.

### 3.2 Local-first policy (TEACHER)
```
Is local_url configured?  ── no ──► use cloud_url
        │ yes
Is local_url reachable? (GET /api/v1/health/live, short timeout)
        │ no
        ├──► fall back to cloud_url (if reachable) → then offline mode
        │ yes
        ▼
Use local_url as base for all API calls (auth + data)
```

### 3.3 Offline operation (see `APU_OFFLINE_FIRST.md`)
- What a teacher can **read offline** (cached): today's timetable, my subjects, my students (roster), attendance marks already taken, announcements.
- What a teacher can **do offline** (queued): mark attendance, (future) enter results.
- Every offline action is written to a local pending queue with idempotency, then replayed when connectivity returns.

## 4. Data & actions the teacher needs offline (document only)

| Item | Online endpoint (reuse) | Offline need |
|---|---|---|
| My timetable | `GET /api/v1/timetable/by-teacher` | cached (daily prefetch) |
| My subjects | `GET /api/v1/teachers/me/subjects` | cached |
| My students | `GET /api/v1/teachers/me/students` | cached roster |
| Take attendance | `POST /api/v1/attendance/bulk` | queued + replayed |
| Results | `GET /api/v1/exam-results/marksheet` | cached view; entry = future |
| Announcements | `GET /api/v1/announcements` | cached feed |

## 5. Security for local mode

- Same authentication as cloud — login against the **local** backend (it has its own users).
- The local server is still protected by its own login, brute-force/rate limits, and authorization.
- **LAN ≠ trusted**: do not skip TLS silently, do not send stored cloud-only refresh tokens to an arbitrary LAN host (only to the resolved/configured local_url).
- WebSocket notifications only while a valid access token exists.

## 6. Sync & recovery (documented; see `APU_SYNC_ARCHITECTURE.md`)

- If the local server and the cloud VPS both exist and the school enables VPS sync (`connect-vps`), server-to-server sync already exists (`sync_queue`, HMAC `/sync/receive`). The teacher's phone only needs to reach **one** of them.
- Recovery after local server restart: offline queue persists in SecureStore; on reconnect, re-validate session, drain queue, reconcile.

## 7. WHAT it reuses

| Piece | Reused from |
|---|---|
| Health probe | `GET /api/v1/health/live` |
| Teacher data endpoints | `teachers.py`, `academic.py`, `attendance.py` |
| Offline license grace | 45-day grace in `license_crypto.py` |
| Local server deployment | `deploy.sh school` on the LAN server |

## 8. Dependencies / assumptions / risks / unresolved

- **Dependencies:** local server running the same `zenova/backend` image; phone on the same LAN.
- **Assumptions:** the school has one local server that is the operational source; offline duration < license grace (45 days).
- **Risks:** LAN endpoint misconfiguration (could leak credentials to the wrong host) → mitigate by resolving local_url only through trusted config; clock skew between phone/server for sync.
- **Unresolved:** whether attendance entry offline must be restricted (the backend already enforces an 08:00–10:00 Ethiopian-time window for `/attendance/bulk`). LAN endpoint source is decided (resolve `local_url` + SecureStore override) and implemented; **certificate trust policy for the LAN server is documented in `APU_CERT_TRUST_POLICY.md`** (design — not yet implemented).
