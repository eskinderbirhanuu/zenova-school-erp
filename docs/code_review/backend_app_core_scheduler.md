# File Reviewed

`backend/app/core/scheduler.py` (245 lines)

## Overview

APScheduler-based background job scheduler. Manages 8 recurring jobs: nightly archive (2AM), nightly backup (3AM), stale session cleanup (every 2h), heartbeat check (every 6h), daily fee calculation (11:30PM), TPM backfill (5:30AM), grace period enforcement (every 4h), device change archive (4AM), monthly invoice generation (1st of month, 1AM).

## Issues

### Issue 1 — Each Job Duplicates the DB Session Lifecycle Pattern

- **Lines:** 10-136 (8 times)
- **Severity:** Medium
- **Category:** Code Quality — DRY
- **Description:** Every job function follows the identical pattern: `SessionLocal()` → try/except/rollback → `finally: db.close()`, all wrapped in an outer try/except for DB acquisition failure.
- **Why it is a problem:** 8 jobs × 12+ lines of boilerplate = ~100 lines of repetitive code. Adding a new job requires replicating the entire pattern.
- **Potential Impact:** High maintenance burden. A change to the session pattern (e.g., adding a timeout) requires editing all 8 jobs.
- **Recommended Fix:** Create a decorator or context manager that handles DB session lifecycle, logging, and error handling.

### Issue 2 — Import Inside Function for Every Job

- **Lines:** 13, 31, 41, 59, 77, 103, 122, 141, 159
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Each job function imports its dependencies (`SessionLocal`, service functions) inside the function body.
- **Why it is a problem:** Imports at function level hide missing dependencies until runtime, and add minor overhead on each job execution.
- **Potential Impact:** Circuluar import avoidance is the likely reason, but this should be handled differently.
- **Recommended Fix:** Move imports to module level. If circular imports are the concern, restructure the service layer.

### Issue 3 — Hardcoded Cron Schedules

- **Lines:** 175-237
- **Severity:** Low
- **Category:** Configuration
- **Description:** All cron schedules are hardcoded. No way to override them via environment variables or settings.
- **Why it is a problem:** An operator who wants to run backups at 4AM instead of 3AM must modify source code.
- **Potential Impact:** Operational inflexibility, especially for deployments across different timezones.
- **Recommended Fix:** Move cron expressions to `settings` with sensible defaults.

### Issue 4 — No Job Monitoring or Error Notifications

- **Lines:** 10-136
- **Severity:** Medium
- **Category:** Observability
- **Description:** All jobs log errors but don't send alerts (email, Slack, etc.) on failure.
- **Why it is a problem:** If the nightly backup or archive fails, the system continues silently. Operators won't know about failures until data loss occurs.
- **Potential Impact:** Silent backup failures → data loss. Silent archive failures → storage overflow.
- **Recommended Fix:** Add a notification channel for critical job failures (email to admin, webhook, etc.).

### Issue 5 — `_cleanup_stale_sessions` Missing `datetime` Import

- **Line:** 82
- **Severity:** Medium
- **Category:** Bug
- **Description:** `datetime.now(timezone.utc)` at line 82 uses `datetime` but it is not imported at module level. The import `from datetime import timedelta` at line 78 only imports `timedelta`.
- **Why it is a problem:** This will raise a `NameError: name 'datetime' is not defined` at runtime when the job runs.
- **Potential Impact:** The stale session cleanup job will fail every 2 hours.
- **Recommended Fix:** Add `from datetime import datetime, timezone` at module level.

## Security Review

- Backup job runs daily — good practice.
- Heartbeat sends license status to license server — necessary for license enforcement.
- No sensitive data in job logs.

## Performance Review

- All jobs run at off-peak hours (overnight or low-activity times).
- DB session creation/destruction per job is appropriate for scheduled tasks.

## Maintainability

- High boilerplate repetition is the main issue.
- Clear job naming and schedule documentation in `add_job` calls.
- The `start_scheduler()` / `stop_scheduler()` lifecycle is clear.

## Architecture Review

- APScheduler is appropriate for single-process deployments.
- For distributed/multi-worker deployments, a distributed task queue (Celery, Redis Queue) would be more appropriate.
- The eight jobs cover essential maintenance tasks — good coverage of system health needs.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 6/10 |
