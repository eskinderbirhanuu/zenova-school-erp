# Architecture Review — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 · **No code was modified.**

This review covers multi-school/branch topology, the hybrid local+cloud model, offline-first design, licensing, the Super-Admin monitoring plane, and scalability concerns. Findings map to `DEEPSEEK_TASKS.md` where implementation is needed.

---

## §1 — Current Architecture

### 1.1 Topology (as designed)

```
                ┌──────── Cloud VPS ────────┐
                │  Parent / Student portals  │
                │  Sync engine (VPS↔Local)   │
                │  Chapa payment gateway     │
                │  Super-Admin monitoring    │
                └─────────────▲──────────────┘
                              │ HTTPS sync (planned)
   ┌──────────────────────────┴──────────────────────┐
   │            School LAN (192.168.x.x)              │
   │  ┌──────────────────────────────────────────┐   │
   │  │ Ubuntu server (old PC / VM)              │   │
   │  │ Docker Compose: Nginx:80 → FE:3000 +     │   │
   │  │                 BE:8000 (FastAPI)         │   │
   │  │ PostgreSQL 16 · Redis 7                   │   │
   │  │ Works fully offline                       │   │
   │  └──────────────────────────────────────────┘   │
   └──────────────────────────────────────────────────┘
```

Each school runs one local stack; branches are additional `branches` rows within the same school DB (or, per the activation flow, a separate branch server with its own `BRANCH` license and a `DIRECTOR`). A central VPS hosts parent/student portals and is the intended sync peer.

### 1.2 Tenancy model

- **Row-level multi-tenancy** via `school_id` (and `branch_id`) foreign keys on most models — there is **no separate schema/database per school**. A single PostgreSQL DB hosts all schools on a given server.
- A SQLAlchemy `before_compile` event (`database.py`) auto-appends `deleted_at IS NULL` for any entity exposing that column — a clean, low-boilerplate soft-delete approach.
- Recent migration `a7b9c1d2e3f4a5b6_add_school_id_remaining` added `school_id` to 21 child tables to close cross-school leaks.

### 1.3 Auth & session

- Cookie-based JWT: `access_token` (30m, HttpOnly, `samesite=strict`) + `refresh_token` (7d, HttpOnly) + `user_role` (client-readable for routing).
- CSRF: double-submit cookie (`csrf_token`) compared against `X-CSRF-Token`, with a curated exempt list (`CSRFMiddleware`).
- Brute-force: Redis counters per IP (20) and per identifier (5), 15-min lockout.

### 1.4 RBAC

13 roles with a `level` (10–100). Two parallel enforcement mechanisms coexist:
1. `require_role("NAME")` — exact string match on `role.name`.
2. `PermissionChecker(code)` — granular permission codes via `ROLE_PERMISSIONS`.

### 1.5 Finance

Double-entry: `JournalEntry` → many `JournalLine`; `create_journal_entry` enforces `sum(debit)==sum(credit)` in Python with a 0.001 tolerance. Auto-GL posting on payments and wallet transactions. `AccountingPeriod` lock gates postings.

### 1.6 Licensing & anti-piracy

- License file `.lic` (OS-specific path) is **RSA-PSS(SHA-256)** signed by a vendor private key; the public key ships in `app/licensing/public_key.py` and is verified at startup.
- Hardware binding via an 8-component fingerprint with **75% tolerance** (≥6/8 match) to allow minor hardware swaps.
- Offline grace: 45 days if the license server is unreachable; feature gating (NFC/QR/import/ID-card) when invalid.
- `watermark.py` adds a forensic `X-Zenova-Instance` header (encrypted) + build ID + request ID to every API response — anti-piracy attribution.

### 1.7 Sync (planned)

`SyncQueue` model + `sync_service`: local writes enqueue pending rows; `process_queue` pushes to a configured VPS URL when `server_role` is `MAIN_SCHOOL`/`BRANCH`. `VPS_SYNC_ENABLED` is currently `False` (sync disabled). The receive side (`/sync/receive`) is a stub — see Security 1.1.

---

## §2 — Weaknesses

### Weakness 2.1 — Hybrid sync plane is unimplemented and unsecured
- **Current:** `process_queue` is half-built; `/sync/receive` accepts arbitrary unauthenticated JSON (Security 1.1). `VPS_SYNC_ENABLED=False`.
- **Impact:** The headline "offline-first local + cloud portal" value proposition does not actually function end-to-end. Worse, the receive stub is a live attack surface.
- **Fix:** Define a versioned, HMAC-signed, idempotent sync protocol (see §4 + Task-19 in `DEEPSEEK_TASKS.md`). Ship it disabled-by-default; never expose `/sync/receive` without auth.

### Weakness 2.2 — Row-level tenancy without DB-level isolation
- **Current:** All schools share one DB/schema; isolation relies on every query remembering to filter `school_id`.
- **Impact:** One forgotten filter = cross-school leak (already happened once; the June-29 migration was the cleanup). `promote_student` (Security 2.3) is a current example. RLS would make this impossible by construction.
- **Fix:** Enable **PostgreSQL Row-Level Security** with a `current_setting('app.school_id')` predicate set per session from the JWT at connection checkout. Keep the app-level filter as defense-in-depth. This is the single highest-leverage architectural hardening available.

### Weakness 2.3 — Two RBAC systems + unused `Role.level`
- **Current:** `require_role` vs `PermissionChecker`; `level` stored, never consulted.
- **Impact:** Authz logic is scattered and inconsistent; `is_view_only` is honored in one system only (Security 2.6).
- **Fix:** Unify (Task-17). Either drive everything from `PermissionChecker` with a level-based fallback, or implement a proper `level >= N` check and deprecate string match.

### Weakness 2.4 — `Base.metadata.create_all` coexists with Alembic
- **Current:** Migrations exist (9 files, several untracked) but the app also runs `create_all` at startup (`main.startup` path imports `Base, engine`).
- **Impact:** Schema drift; production may run a schema that no migration describes; upgrades become unreliable. The "54 models missing `deleted_at`" issue (AI-14) is partly a symptom.
- **Fix:** Production runs Alembic-only (`alembic upgrade head`) via the deployment script; `create_all` is dev-only behind an `ENVIRONMENT != production` guard.

### Weakness 2.5 — `log_audit` self-commit breaks the unit-of-work pattern
- (Cross-ref AI-5 / Security 2.1.) The audit layer forcing commits subverts SQLAlchemy's transactional unit of work, so several services are effectively auto-committing piecemeal. This is architectural, not just a bug.

### Weakness 2.6 — Split-brain state across models
- `School.is_setup_complete` is recomputed in `/setup/status` instead of trusted → split truth (REVIEWS contradiction #7).
- `Student.status` vs `User.is_active`: an inactive student may still have a working portal `User` (REVIEWS #8).
- `Invoice.paid_amount` updated incrementally, can desync from `sum(Payment)` (REVIEWS #10).
- `Wallet.balance` is a stored column duplicating derivable state (REVIEWS #9).
- **Fix:** Treat the canonical column as the source of truth, derive the rest, and add reconciliation jobs.

### Weakness 2.7 — Single-process deployment; no workers/queue
- `Dockerfile` CMD runs `uvicorn ... :8000` with no `--workers`. On a multi-core box the app uses one core; on a busy school LAN this under-utilizes hardware.
- No task queue (Celery/RQ/Arq): notifications, Excel generation, sync enqueue, and backups all run inline in the request thread. Large exports block workers (Performance).
- **Fix:** `uvicorn ... --workers N` (or gunicorn with uvicorn workers) behind Nginx; introduce a lightweight async queue (Arq on the existing Redis) for notifications, exports, sync.

### Weakness 2.8 — Branch-as-separate-server is underspecified
- The activation flow lets a `BRANCH` license bring up a **separate** server with its own DB and a `DIRECTOR`. But the data model treats branches as rows in the school DB. It is unclear whether branch servers replicate the parent school's `schools` row, how branch→main sync works, or how a report aggregating "all branches" is produced.
- **Fix:** Document explicitly: (a) branch = row in main DB (single server), or (b) branch = separate server syncing up. Pick one; the activation endpoint currently implies (b) while the rest of the app assumes (a).

### Weakness 2.9 — Cloud portal trust boundary
- Parent/student portals are "cloud only", meaning the cloud VPS must hold or proxy student data. If the VPS has a copy of the DB, PII leaves the school LAN — a compliance concern (and the unsecured `/sync/receive` is the ingestion point). If it only proxies, latency/availability suffer.
- **Fix:** Decide and document the data residency model; if the VPS stores PII, encrypt at rest, scope by school, and secure the sync channel.

---

## §3 — Recommended Improvements

1. **Enable PostgreSQL RLS** keyed on `app.school_id` (§2.2). Highest leverage.
2. **Ship a real, signed sync protocol** (§4) or remove the receive stub.
3. **Unify RBAC** around `PermissionChecker` + level-based checks (Task-17).
4. **Alembic-only migrations in prod**; dev-only `create_all`.
5. **Introduce a background worker** (Arq on Redis) for notifications, exports, backups, sync.
6. **Reconcile split-brain state** (§2.6) with periodic consistency jobs.
7. **Multi-worker uvicorn** behind Nginx with sensible `--workers`.
8. **Centralize tenant scoping** in a `tenant_query(Model, db, user)` helper to make the default safe.

---

## §4 — Scalability Concerns

| Concern | Evidence | Outlook |
|--------|----------|---------|
| Connection pool sized 10+20 (`database.py`) | One worker × 30 conns is fine for ~500 students; at 20k with reporting bursts, pool starvation | Scale workers; consider pgBouncer |
| N+1 in transcript/portal/trial-balance | `students.py:226+`, `parent_portal.py:23+`, `finance_service.trial_balance` | Rewrite with eager loading / aggregates (Task-16) |
| Unbounded list/export queries | `export_students_excel` loads up to 5000 rows; many `list_*` default 50 but accept `limit=200` | Paginate + stream (Performance) |
| COUNT()-based sequence numbers | `_next_invoice_number`, `_next_payment_number` use `count()+1` — races + table scans | Move to `number_sequences` (Task-07/20) |
| Audit log growth | Every mutation writes a row; no retention/partitioning | Partition by month, archive after N months |
| JSONB `schools.settings` unstructured | Flexible but unindexable hot paths | Promote hot keys to columns + indexes |
| Single Redis, no HA | Rate limits, license cache, sessions all depend on Redis | Redis Sentinel/AOF for prod |

**Target scale:** The design targets 500–20,000 students. At the upper bound on a single-server deployment, the N+1 queries and COUNT-based sequences are the first walls; RLS + eager loading + sequence-table + a worker pool clear them. Multi-school SaaS scale (many schools on one VPS) is **not** currently viable without RLS + per-tenant connection routing.

---

## §5 — Proposed Sync Protocol (for §2.1)

1. **Registration:** At activation the local server registers with the VPS, exchanging a `server_id` and a random 32-byte `sync_secret` (stored hashed locally in `server_identity`).
2. **Outbound (`/sync/trigger`):** `process_queue` batches pending `SyncQueue` rows, canonical-JSON-encodes each, signs `HMAC-SHA256(sync_secret, body + ts)`, POSTs to `${vps_url}/api/v1/sync/receive` with headers `X-Zenova-Server-Id`, `X-Zenova-Sync-Sig`, `X-Zenova-Sync-Ts`. Marks rows `SENT` with a delivery token; awaits per-row ACK.
3. **Inbound (`/sync/receive`):** Verifies HMAC + ±60s ts + registered `server_id`; enforces idempotency via `(table_name, record_id, operation, payload_hash)` dedupe; applies within a transaction; emits ACKs. Rejects unsigned/unregistered traffic with 401/403 (never 404-only — log first).
4. **Conflict policy:** last-write-wins by `updated_at` for non-financial entities; financial entities (journal entries, payments) are append-only / reversal-only and never mutated by sync.
5. **Backpressure:** per-server rate limit; batch size capped; exponential retry with jitter.

---

## §6 — Migration Recommendations

| From | To | Risk | Sequencing |
|------|----|------|-----------|
| `create_all` at startup | Alembic-only in prod | Low | Add env guard, update deploy script |
| App-level `school_id` filters | + Postgres RLS | Medium | Add policy, set `app.school_id` per session, shadow-test |
| Inline notifications/exports/backups | Arq worker on Redis | Medium | Extract job funcs, deploy worker container |
| Single uvicorn worker | N workers behind Nginx | Low | Tune by core count |
| Two RBAC systems | Unified `PermissionChecker` | Medium | Sweep routes, add tests |
| COUNT()-based numbering | `number_sequences` table | Low-Medium | Migrate finance number generators (Task-20) |

---

## §7 — Verdict

The architecture is **coherent and well-intentioned** for the target market (single-school or small multi-branch deployments on commodity hardware). The domain modeling (double-entry, soft-delete event hook, license signing, audit-everything) is above average for this category. The **three architectural gaps** that prevent the stated "hybrid cloud + offline-first + multi-school" story from being real are:

1. The **sync plane is a stub and unsecured** (§2.1) — the cloud/offline value prop is not delivered.
2. **Tenancy is enforced only in app code**, not at the DB (§2.2) — leaks are inevitable as the codebase grows.
3. **Cross-cutting concerns (audit, authz, numbering) are layered incorrectly** (self-committing audit, dual RBAC, COUNT-based IDs) — these will cause both correctness and scale problems.

None require a rewrite; all are addressable incrementally per `DEEPSEEK_TASKS.md`.
