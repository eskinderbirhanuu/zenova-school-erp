# File Reviewed

`backend/app/services/backup_service.py` (233 lines)

## Overview

Database backup service — creates PostgreSQL dumps (or JSON fallback), encrypts with age/GPG, uploads to cloud storage (S3-compatible or rclone), and applies retention-based rotation (hourly/daily/weekly tiers).

## Issues

### Issue 1 — JSON Fallback Backup Contains No Real Data

- **Lines:** 127-133
- **Severity:** High
- **Category:** Functionality
- **Description:** When `pg_dump` is not found, the backup is a JSON file containing `{"backup": "placeholder", "manifest": manifest}` — literally no data.
- **Why it is a problem:** The backup is useless for restore. The "backup succeeded" message is misleading.
- **Potential Impact:** Operators believe they have backups, but restore would return zero data.
- **Recommended Fix:** Use a SQL dump via raw psycopg2 connection as fallback.

### Issue 2 — Cloud Upload Credentials Sent via Basic Auth Over HTTP

- **Lines:** 76-96
- **Severity:** High
- **Category:** Security
- **Description:** Cloud upload uses HTTP Basic Auth with base64-encoded credentials. If the `backup_cloud_url` is HTTP (not HTTPS), credentials are sent in plaintext.
- **Why it is a problem:** Credential interception via man-in-the-middle.
- **Potential Impact:** Cloud storage credentials compromised.
- **Recommended Fix:** Enforce HTTPS or use signed URLs.

### Issue 3 — `pg_dump` Command Passes Database URL as CLI Argument

- **Lines:** 121-123
- **Severity:** Medium
- **Category:** Security
- **Description:** The full `database_url` (which may contain username/password) is passed as a CLI argument to `pg_dump`. Other processes on the server can see it via `ps` or `/proc`.
- **Why it is a problem:** Credential exposure to local users and processes.
- **Potential Impact:** Database credentials leak to anyone with process list access.
- **Recommended Fix:** Use `PGPASSWORD` environment variable or `~/.pgpass`.

### Issue 4 — Disk Space Not Checked Before Backup

- **Lines:** 114-163
- **Severity:** Medium
- **Category:** Reliability
- **Description:** No check for available disk space before running pg_dump.
- **Why it is a problem:** A large database backup could fill the disk, crashing the application.
- **Potential Impact:** Application outage due to disk full.

### Issue 5 — Rotation Logic Overlaps Between Tiers

- **Lines:** 170-203
- **Severity:** Medium
- **Category:** Logic
- **Description:** Hourly retention keeps recent backups, daily retention keeps the last backup of each day, and weekly keeps the last backup of each week. A backup could be retained by all three tiers, which is correct, but the iteration order means backups newer than the retention window are missing from the keep set (they're never archived, so they're never removed). Actually, looking more carefully: `by_age` is sorted reverse, so the newest backups are processed first for hourly. The daily tier then looks at ALL backups (not just those outside hourly window). This means a backup retained by hourly could also count toward daily, reducing effective daily retention.

This is acceptable but confusing. Not a critical bug.

## Security Review

- **Strong points:** Age/GPG encryption, cloud upload auth support.
- **Weak points:** Credentials on command line, plaintext HTTP Basic Auth, JSON placeholder fallback.

## Performance Review

- `pg_dump` is I/O-intensive — fine for background schedule.
- No concern about application performance.

## Maintainability

- Well-structured with clear function separation.
- Encryption fallback chain (age → GPG → none) is well-implemented.
- Cloud upload abstraction supports multiple backends.

## Architecture Review

- Backup strategy supports local, encrypted, and cloud targets — good.
- Retention policy is tiered with clear constants.
- Missing: backup verification (restore test), monitoring alerts on failure, health checks.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 5/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
