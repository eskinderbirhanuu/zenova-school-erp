# File Reviewed

`backend/app/services/id_service.py` (59 lines)

## Overview

Auto-incrementing ID generator — produces formatted IDs (e.g., `STU-2026-00001`) with per-school, per-year, per-prefix sequences using `NumberSequence` table with row-level locking.

## Issues

### Issue 1 — Retry Logic Has a Bug: `seq` Set to `None` After IntegrityError on First Insert

- **Lines:** 27-57
- **Severity:** Medium
- **Category:** Bug
- **Description:** On the first attempt, if the sequence doesn't exist, we create it and flush. If `db.flush()` raises `IntegrityError` (race condition — another transaction inserted the same sequence), `seq` is set to `None` and `continue` retries. On retry, `with_for_update().first()` should find the sequence. This logic is correct but fragile.
- **Why it is:** The retry logic works but is complex. Simpler: use `merge()` or upsert.

### Issue 2 — Retry Does Not Re-acquire Lock on Retry

- **Lines:** 46-51
- **Severity:** Low
- **Category:** Concurrency
- **Description:** After `db.rollback()`, a new transaction starts. The `with_for_update()` on retry acquires a new lock. This is correct behavior — no issue.

### Issue 3 — `last_number` Increment Not Atomic

- **Lines:** 49-51
- **Severity:** Low
- **Category:** Concurrency
- **Description:** `seq.last_number += 1` followed by `db.flush()` is not atomic — another transaction could read the same value between the increment and flush. However, `with_for_update()` prevents this.
- **Why it is:** With row-level locking, this is safe.

## Security Review

- No user input beyond entity_type — safe.

## Performance Review

- Row-level lock on sequence table — acceptable for ID generation.
- The 3-retry limit prevents infinite loops.

## Maintainability

- Clean, well-documented service.
- The `PREFIX_MAP` makes adding new entity types easy.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 9/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
