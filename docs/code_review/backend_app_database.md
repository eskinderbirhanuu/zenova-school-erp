# File Reviewed

`backend/app/database.py` (48 lines)

## Overview

SQLAlchemy database engine configuration with automatic soft-delete filtering via query listener. Provides session factory and FastAPI dependency injection.

## Issues

### Issue 1 — Soft-Delete Filter Mutates Internal Query State

- **Lines:** 20-29
- **Severity:** Medium
- **Category:** Code Quality — Mutation of Private Attributes
- **Description:** The `_filter_soft_deleted` listener saves, clears, and restores `query._limit_clause` and `query._offset_clause` to apply the soft-delete filter. This manipulates private SQLAlchemy internals.
- **Why it is a problem:** Accessing and mutating `_limit_clause` and `_offset_clause` relies on undocumented SQLAlchemy internals that could change between versions.
- **Potential Impact:** Could break silently after a SQLAlchemy upgrade, potentially removing LIMIT/OFFSET from queries or causing incorrect results.
- **Recommended Fix:** Use `query.enable_assertions(False)` or apply the filter before LIMIT/OFFSET is set. Better approach: use a custom `Query` subclass with `__init__` override instead of manipulating private attributes.

### Issue 2 — No SSL/TLS Configuration for Database

- **Line:** 32-38
- **Severity:** High
- **Category:** Security
- **Description:** The `create_engine` call does not include any SSL/TLS parameters (`ssl` or `connect_args` for SSL mode).
- **Why it is a problem:** In production, database traffic between the application server and PostgreSQL will be unencrypted if SSL is not explicitly enabled.
- **Potential Impact:** Credentials and all data in transit can be intercepted on the network.
- **Recommended Fix:** Add `connect_args={"sslmode": "require"}` in production, or read SSL mode from settings.

### Issue 3 — No Connection Timeout

- **Lines:** 32-38
- **Severity:** Medium
- **Category:** Performance / Reliability
- **Description:** No `pool_timeout` or connection timeout is configured.
- **Why it is a problem:** If the database is unavailable or all connections are busy, the application could hang indefinitely waiting for a connection.
- **Potential Impact:** API endpoints could become unresponsive, leading to cascading failures.
- **Recommended Fix:** Add `pool_timeout=30` (seconds) to `create_engine`.

### Issue 4 — No Statement Timeout

- **Lines:** 32-38
- **Severity:** Medium
- **Category:** Performance / Reliability
- **Description:** No statement-level timeout is configured.
- **Why it is a problem:** A slow or unoptimized query could run for minutes, consuming database and application resources.
- **Potential Impact:** Database CPU spikes, connection pool exhaustion, API timeouts.
- **Recommended Fix:** Set `query_timeout` via `connect_args` or at the session level using `SessionLocal` configuration.

### Issue 5 — Soft-Delete Filter Not Applied to Joins/Relationships

- **Lines:** 6-30
- **Severity:** Medium
- **Category:** Architecture
- **Description:** The soft-delete filter only checks the root entity of a query, not eagerly-loaded relationships or joins.
- **Why it is a problem:** A query for `School` with eager-loaded `students` could return soft-deleted students even though the school itself is not deleted.
- **Potential Impact:** Soft-deleted records could appear in UI and reports through relationship loading.
- **Recommended Fix:** Use a SQLAlchemy `with_loader_criteria` event for global filtering, or apply `filter_by(deleted_at=None)` on all relationship definitions.

### Issue 6 — No `pool_pre_ping` Benefit Without `pool_timeout`

- **Lines:** 34
- **Severity:** Low
- **Category:** Configuration
- **Description:** `pool_pre_ping=True` tests connections before use, which is good. But without `pool_timeout`, a failed check could still block indefinitely.
- **Why it is a problem:** `pool_pre_ping` improves reliability of reused connections, but doesn't help if the pool itself is exhausted.
- **Potential Impact:** Reduced reliability under load.
- **Recommended Fix:** Add `pool_timeout=30`.

### Issue 7 — `get_db` Generator Uses Raw `SessionLocal()`

- **Lines:** 43-48
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `get_db` creates a session with `SessionLocal()` directly; no session-level configuration (timeout, autocommit) is applied.
- **Why it is a problem:** The session inherits engine defaults but has no explicit safeguards.
- **Potential Impact:** Minor — sessions behave correctly but lack explicit safety nets.
- **Recommended Fix:** Consider adding `expire_on_commit=False` to avoid expired attribute access after commit in async request flows.

## Security Review

- **Strong points:** `pool_pre_ping` prevents stale connections, `Base` declarative base is standard, session generator correctly ensures `close()` in `finally` block.
- **Weak points:** **No SSL/TLS** — critical for production. No encrypted connection enforcement. Soft-delete filter is a custom listener rather than a proven pattern.
- **Verdict:** Database.py is minimal and clean but lacks production-hardening features.

## Performance Review

- `pool_size=10` and `max_overflow=20` with default pool recycling of 1800s — reasonable defaults.
- No statement timeout could allow runaway queries.
- Soft-delete filter manipulation of LIMIT/OFFSET could have minor performance impact.

## Maintainability

- Very short (48 lines), easy to understand.
- Soft-delete listener is clever but fragile due to private attribute access.
- Single-responsibility: does exactly what a database.py should.

## Architecture Review

- Standard FastAPI + SQLAlchemy pattern (engine → sessionmaker → dependency injection).
- Global soft-delete filtering via event listener is an interesting architectural choice — it centralizes soft-delete logic but at the cost of implicit behavior that might surprise developers.
- The architecture would benefit from a repository/DAO layer for query encapsulation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 5/10 |
| Performance | 7/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
