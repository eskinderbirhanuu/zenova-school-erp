# File Reviewed

`backend/app/services/archive_service.py` (210 lines)

## Overview

Data archival service — moves old records from operational tables (attendance, notifications, audit_logs, sync_queue) to an `ArchivedRecord` table based on configurable retention periods. Supports restore with or without force-overwrite.

## Issues

### Issue 1 — `run_archive` Can Time Out on Large Tables

- **Lines:** 71-140
- **Severity:** High
- **Category:** Performance
- **Description:** Loads all candidate records into memory (`candidates = q.all()`), then iterates one by one in a single synchronous loop. For tables with millions of rows, this will exhaust memory and cause long-running transactions.
- **Why it is a problem:** The archive job could crash the server on large tables.
- **Potential Impact:** OOM on production with large attendance/audit tables.
- **Recommended Fix:** Process in batches (e.g., 1000 rows per batch) using server-side cursors or `yield_per`.

### Issue 2 — `run_archive` Not Suitable for Concurrent Execution

- **Lines:** 71-140
- **Severity:** Medium
- **Category:** Reliability
- **Description:** Multiple archive jobs running simultaneously would see the same candidates and try to archive them concurrently.
- **Why it is a problem:** Duplicate archive records or delete conflicts (DELETE of already-deleted row).
- **Recommended Fix:** Use a distributed lock or single-worker scheduling.

### Issue 3 — Serialization Doesn't Handle All Column Types

- **Lines:** 202-210
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `_serialize_row` only handles `datetime`. Other non-serializable types (UUID, Decimal, Enum, JSON) are stored directly.
- **Why it is a problem:** Restoring a JSON/Decimal/UUID column may fail or produce incorrect data.
- **Potential Impact:** Data corruption in restored records.

### Issue 4 — `restore_records` Creates New ID via `model_cls(**row_data)`

- **Lines:** 185-186
- **Severity:** High
- **Category:** Bug
- **Description:** `row_data` includes the original `id` (from `TABLE_PK_MAP`). If the model has `id` as auto-increment primary key, passing it explicitly may cause integrity errors or fail silently.
- **Why it is a problem:** Restoring a record with an explicit ID may conflict with existing auto-generated IDs.
- **Potential Impact:** Restore fails or creates record with wrong ID.
- **Recommended Fix:** Remove `id` from `row_data` before `model_cls(**row_data)`, unless the PK is UUID-based.

### Issue 5 — `get_table_sizes` Logs Exception Silently

- **Lines:** 66-67
- **Severity:** Low
- **Category:** Error Handling
- **Description:** Exception during table size query is caught and logged as `-1` — no logging.
- **Why it is a problem:** Silent failures make debugging difficult.

## Security Review

- Archived records are stored as JSON — no encryption at rest.
- Restore doesn't check permissions.
- School_id is preserved in archive entries — good for tenant isolation.

## Performance Review

- OOM risk on large tables — see Issue 1.
- Individual row processing is slow but acceptable for archival (background job).

## Maintainability

- Well-structured with clear table configuration maps.
- Restore logic is clear with good separation of overwrite vs. create.

## Architecture Review

- Archive pattern is well-designed (separate ArchiveJob + ArchivedRecord tables).
- Models are resolved dynamically via `_resolve_model` — flexible but fragile.
- The lack of batch processing is the main architectural concern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 4/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
