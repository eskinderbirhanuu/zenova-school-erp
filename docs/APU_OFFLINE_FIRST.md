# APU Offline-First Design

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE — design only, **not implemented**.
> WHAT / WHY / HOW / WHAT-it-reuses for offline behavior across roles.

## 1. WHAT are we building?

Behavior rules for when APU has **no connectivity** at all (no Internet, no LAN) — per role.

## 2. WHY

- A teacher inside a classroom during a network outage must still mark attendance and see the roster.
- Parents/students are cloud-only; they get cached reads, no offline writes.

## 3. HOW it works (per role)

### 3.1 TEACHER (the primary offline user)
| Need | Offline behavior |
|---|---|
| Roster | Cache `GET /teachers/me/students` (prefetch on login + daily) |
| Timetable | Cache `GET /timetable/by-teacher` |
| Subjects | Cache `GET /teachers/me/subjects` |
| Attendance today | Cache today's marks; **queue** new marks via `POST /attendance/bulk` (idempotency) |
| Announcements | Cache `GET /announcements` feed |
| Read results | Cache last marksheet |
| Write results | **Not supported offline** (backend gates result entry to admins anyway) |

### 3.2 PARENT (cloud-only)
- Cache dashboard, invoices, announcements; no offline writes (payments need the gateway online).
- Show "last updated" timestamp; stale-badge when offline.

### 3.3 STUDENT (cloud-only)
- Cache dashboard snapshot, assignments, results, announcements; read-only offline.

## 4. Offline indicators

- Global connectivity banner (App shell): mode = online / local-only / offline, with last-sync time.
- On reconnect: automatic drain of the pending queue + cache refresh + silent re-auth check.

## 5. Storage budget

- SecureStore is small KV — keep caches lean:
  - roster ≤ current section(s), not the whole school;
  - timetable for today + next 2 days;
  - announcements last N (e.g. 50);
  - results: only student/subjects the teacher actually views.
- Purge LRU when exceeding a fixed budget (documented constant, e.g. 5 MB).

## 6. Re-auth on reconnect

- Refresh token rotates; if refresh fails (server restarted → different secret), show login screen with a friendly message (offline changes are preserved in the queue).

## 7. WHAT it reuses

| Piece | Reused from |
|---|---|
| Offline grace | 45-day license grace (protects school server, not phone) |
| Attendance window | server-enforced 08:00–10:00 ET on replay |
| Idempotency | same header as payments |

## 8. Dependencies / assumptions / risks / unresolved

- **Dependencies:** SecureStore persisted queue; clock sanity checks.
- **Assumptions:** offline windows are hours, not days.
- **Risks:** stale roster shown as current → always show "as of <time>"; queue drained to the wrong backend after switching school → queue is cleared on school switch.
- **Unresolved:** push notification delivery while offline (WebSocket won't reach the phone — acceptable; pull-to-refresh covers it).
