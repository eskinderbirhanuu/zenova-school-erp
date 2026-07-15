# Directory Reviewed: `backend/alembic/versions/`

29 migration version files covering:

- **Initial schema** (`56e806ae8fa1`) — 45+ tables
- **Feature additions**: payment tables, student documents, card designs, archive tables, sync queue, notification prefs, Telegram bot, NFC v2 tables/corporate, platform commission tables, server identity, password history, TPM sealed data, device change requests
- **Schema migrations**: composite indexes, `school_id` backfill on child tables, `deleted_at` on remaining tables, `card_tier` on NFC cards, float→DECIMAL conversion, `school_id` on NFC v2 cards, hash existing NFC card UIDs
- **Data migrations**: runtime environment

## Issues

### Issue 1 — Good Incremental Migration Pattern

- **Severity:** Good
- **Category:** Architecture
- **Description:** Migrations are well-named and add features incrementally. Uses `CREATE INDEX IF NOT EXISTS` in `af43149492e0`.

### Issue 2 — Raw SQL Used in Some Migrations

- **Severity:** Note
- **Category:** Maintainability
- **Description:** Some migrations use `op.execute(...)` with raw SQL rather than Alembic's `op` API.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
