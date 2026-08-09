# APU Sync Architecture

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE — design only, **not implemented**.
> WHAT / WHY / HOW / WHAT-it-reuses for APU's offline-queue and reconnect sync.

## 1. WHAT are we building?

A client-side sync layer that lets APU **queue actions offline** (attendance, messages) and **replay them** when connectivity returns — without corrupting the source-of-truth school database.

## 2. WHY

- Teachers must mark attendance inside the school LAN even when the Internet is down.
- The school database is the **source of truth**; the phone is a cache + pending-action queue, never an authoritative store.

## 3. HOW it works (design)

### 3.1 Entities
- **Cache store**: SecureStore (small KV) for roster, timetable, announcements, dashboard snapshots.
- **Pending queue**: an ordered, persisted list of operations `{ idempotency_key, endpoint, method, payload, queued_at, attempts }`.
- **Idempotency keys**: UUIDv4 generated per queued action. The backend already supports idempotency for payments (`X-Idempotency-Key`); reuse the same pattern for all mutating calls.

### 3.2 Lifecycle
```
Action taken offline
   │
   ▼
Write to local pending queue (persisted, idempotency_key set)
   │
   ▼ (connectivity restored / periodic drain)
Replay loop:
   for each queued op (FIFO):
     POST/PATCH endpoint (with idempotency_key)
       200/201 → remove from queue
       409/422 (already applied / invalid) → mark skipped
       4xx other → mark failed, surface to user
       5xx/timeout → keep, retry with exponential backoff
   │
   ▼
Reconcile: re-fetch affected read caches (roster, attendance for the day)
```

### 3.3 Backoff & concurrency
- Exponential backoff: 5s → 15s → 60s → 5min → 15min, capped; jittered.
- One replay loop at a time; no parallel mutations of the same entity.
- If the school has both a local server and a cloud VPS with `connect-vps` sync enabled, the phone must only write to **one** backend — replaying to both could double-apply (the `sync_queue` deduplicates server-side, but keep it simple: choose the endpoint the session was established on).

## 4. Conflict handling (document only)

- Policy: **server timestamp wins**; phone is the replica.
- Reuse the existing `ConflictLog` pattern (`backend` `conflict_log.py`) for any future server-side conflict recording.
- Detect conflicts on replay by checking `updated_at`/`version` when present; if a conflict is detected, surface to the teacher ("this record changed on the server — review before overwrite").

## 5. Idempotency (reuse)

- Backend: `X-Idempotency-Key` header (payments). Extend the same helper for `attendance/bulk` and `messages`.
- Backend gap to note: not all mutating endpoints accept an idempotency key today — the sync design assumes this gets standardized.

## 6. Guarantees

- **At-least-once** delivery (idempotency makes duplicates harmless).
- **Ordered** within a single entity (FIFO queue per entity).
- **Persisted** across app kills (SecureStore-backed queue).

## 7. WHAT it reuses

| Piece | Reused from |
|---|---|
| Idempotency header | `backend` payments idempotency helper |
| Conflict logging | `backend` `ConflictLog` |
| Server↔server sync | `sync_queue`, `/sync/receive` (HMAC) — reference only |

## 8. Dependencies / assumptions / risks / unresolved

- **Dependencies:** backend idempotency standardized across mutating endpoints (gap).
- **Assumptions:** offline windows are short (single school day); phone clock roughly synced.
- **Risks:** clock skew breaks "server timestamp wins"; large queues on a weak LAN phone; replaying a partially-failed action (mitigated by idempotency).
- **Unresolved:** whether offline result entry should be allowed (backend gate `students.create` says no for teachers today); whether the 08:00–10:00 ET attendance window applies to queued marks (it should — enforce server-side at replay time).
