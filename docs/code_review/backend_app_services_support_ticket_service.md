# File Reviewed

`backend/app/services/support_ticket_service.py` (137 lines)

## Overview

Support ticket service — ticket number generation (sequential `TKT-NNN`), CRUD with status/priority filtering, and ticket counts by status.

## Issues

### Issue 1 — Ticket Number Generation Has Race Condition

- **Lines:** 7-20
- **Severity:** High
- **Category:** Concurrency
- **Description:** Reads `MAX(ticket_number)` and increments in memory — two concurrent requests get the same number.
- **Why it is a problem:** Duplicate ticket numbers.
- **Potential Impact:** Confusion in support system.
- **Recommended Fix:** Use a database sequence or `id_service.py` pattern.

### Issue 2 — Ticket Number Sequential, Not Per-School

- **Lines:** 7-20
- **Severity:** Low
- **Category:** Design
- **Description:** Ticket numbers are global sequential. If `school_id` is provided, it filters by school when finding the last ticket, but this still has the race condition.
- **Why it is:** Race condition persists regardless of scoping.

### Issue 3 — `create_ticket` Sets `ticket_number` Before Commit

- **Lines:** 24-25
- **Severity:** Note
- **Description:** `generate_ticket_number` is called before the ticket is saved, so the "last ticket" query won't find the ticket just being created. This is inherent to the sequential approach.

### Issue 4 — `get_ticket_counts` Counts With Separate Queries

- **Lines:** 127-137
- **Severity:** Low
- **Category:** Performance
- **Description:** One query for total, then three more for status counts. Could use `GROUP BY`.
- **Potential Impact:** 4 queries for a simple counts endpoint.

## Security Review

- School_id filtering on queries.
- No sensitive data exposure.

## Performance Review

- Acceptable for support ticket volume.

## Maintainability

- Clean CRUD patterns.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
