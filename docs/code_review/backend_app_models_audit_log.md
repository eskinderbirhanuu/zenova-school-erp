# File Reviewed

`backend/app/models/audit_log.py` (21 lines)

## Overview

Audit log model — immutable record of all data changes. Stores user, action, table, record ID, old/new data, IP, and user agent.

## Issues

### Issue 1 — No `deleted_at` on Audit Log (Soft Delete Would Defeat the Purpose)

- **Line:** 21
- **Severity:** Medium
- **Category:** Architecture
- **Description:** AuditLog has a `deleted_at` field for soft delete.
- **Why it is a problem:** Audit logs should be immutable — they lose their value if they can be "deleted" (even softly). A user with database access could set `deleted_at` and effectively erase the audit trail.
- **Potential Impact:** Audit integrity is compromised. Regulators require non-repudiation.
- **Recommended Fix:** Remove the `deleted_at` field from AuditLog. Use a separate archive table for old records.

### Issue 2 — No `school_id` Is Nullable

- **Line:** 11
- **Severity:** Low
- **Category:** Architecture
- **Description:** `school_id` is nullable, meaning some audit log entries may not be scoped to a school.
- **Why it is a problem:** In a multi-tenant system, school-scoped queries may miss audit entries with null school_id.
- **Potential Impact:** Super-admin actions that affect all schools might not appear in any school's audit.
- **Recommended Fix:** Make `school_id` non-nullable for tenant-scoped actions, and use a special "SYSTEM" school ID for system-level actions.

### Issue 3 — `user_id` Is Not a Proper FK

- **Line:** 17
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `user_id` is `String(36)` with no ForeignKey constraint to `users.id`.
- **Why it is a problem:** Audit logs could reference non-existent users (e.g., if a user is hard-deleted or the FK is missing).
- **Potential Impact:** Orphaned audit records that can't be traced to a user.
- **Recommended Fix:** Add a ForeignKey constraint to `users.id`.

### Issue 4 — Indexes Are Comprehensive

- **Lines:** 11, 12, 13, 14, 17, 20
- **Severity:** Positive
- **Category:** Performance
- **Description:** Indexes on `school_id`, `table_name`, `record_id`, `action`, `user_id`, and `created_at` — excellent query coverage.
- **Why it is a benefit:** Audit queries by any common dimension will be fast.

## Security Review

- **Strong points:** Comprehensive indexed columns for forensic queries. Stores old/new data as JSON for change tracking. Records IP and user agent for attribution.
- **Weak points:** `deleted_at` on an immutable audit log is contradictory. Missing FK on `user_id`.
- **Verdict:** Good audit model that correctly captures the essentials. The `deleted_at` field should be removed.

## Performance Review

- Multiple indexes ensure fast audit queries.
- JSON columns for old/new data are efficient for storage and queryable via PostgreSQL JSON operators.

## Maintainability

- Very short and clean (21 lines).
- Well-chosen column types.

## Architecture Review

- Audit logging is correctly separated from other concerns.
- The `deleted_at` field on an audit table is an architectural contradiction.
- The model correctly captures who, what, when, where, and what changed.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 7/10 |
