# File Reviewed

`backend/app/models/archive.py` (32 lines)

## Models

- `ArchiveJob` — tracks archival runs: `table_name`, `cutoff_date`, counts, `status`, timestamps.
- `ArchivedRecord` — stores archived row data as JSON blob with `job_id`, `table_name`, `record_id`, `school_id`, `data` (JSON).

## Issues

### Issue 1 — `data` Column Uses JSON Type

- **Lines:** 31
- **Severity:** Note
- **Category:** Architecture
- **Description:** `JSON` column stores full record snapshots. Good for archival — no need for structured columns.

### Issue 2 — `ArchivedRecord` Has No Relationship to Original Table

- **Lines:** 27-29
- **Severity:** Note
- **Category:** Architecture
- **Description:** Intentional — archived records are decoupled from source tables.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
