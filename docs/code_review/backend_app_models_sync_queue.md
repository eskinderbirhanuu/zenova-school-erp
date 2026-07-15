# File Reviewed

`backend/app/models/sync_queue.py` (37 lines)

## Overview

Sync queue model — offline-to-cloud synchronization mechanism. Tracks table-level CRUD operations with status, retry count, priority, and source version.

## Issues

### Issue 1 — `retry_count` and `priority` Are Strings Instead of Integers

- **Lines:** 30-31
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `retry_count` is `String(10)` default `"0"` and `priority` is `String(10)` default `"5"`. Both should be integers.
- **Why it is a problem:** String-encoded integers can't be sorted or compared numerically. `"9"` > `"10"` is False.
- **Potential Impact:** Priority ordering fails — high-priority items with number 10 won't be processed before low-priority items with number 9.
- **Recommended Fix:** Change to `Integer` columns.

### Issue 2 — `payload` Is Text Instead of JSON

- **Line:** 28
- **Severity:** Low
- **Category:** Functionality
- **Description:** `payload` is `Text` rather than `JSON`. The payload contains the serialized record data for sync.
- **Why it is a problem:** JSON column type in PostgreSQL provides validation and query capabilities. Text does not.
- **Potential Impact:** Database can't validate the payload format. Debugging requires manual parsing.
- **Recommended Fix:** Change to `JSON` column type.

### Issue 3 — No FK Constraints for `school_id` and `branch_id`

- **Lines:** 33-34
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `school_id` and `branch_id` are plain String columns without ForeignKey constraints.
- **Why it is a problem:** Sync records could reference non-existent schools or branches.
- **Potential Impact:** Orphan sync records after school deletion.
- **Recommended Fix:** Add FK constraints.

## Security Review

- No security issues. Payload may contain data that should be encrypted before storage (field-level encryption not shown here).

## Performance Review

- Indexes on `table_name`, `record_id`, `status`, `priority`, `school_id`, `branch_id` — excellent query coverage.
- The sync worker processes by priority and status — efficient queue processing.

## Maintainability

- Clean enum usage for operation and status.
- Good field documentation.

## Architecture Review

- Sync queue is the core of the offline-first architecture — well-designed for the purpose.
- String vs Integer for retry_count and priority is a design oversight.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
