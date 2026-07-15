# File Reviewed

`backend/app/models/server.py` (30 lines)

## Model

- `ServerIdentity` — multi-tenancy server registry with `ServerRole` enum (`SUPER_ADMIN`, `MAIN_SCHOOL`, `BRANCH`).
- Key fields: `server_id` (unique), `fingerprint_sha256` (unique), `parent_server_id`, `is_trusted`, `sync_enabled`, `last_seen`, `vps_url`.

## Issues

### Issue 1 — Good Server Identity Model

- **Lines:** 7-30
- **Severity:** Good
- **Category:** Architecture
- **Description:** Well-designed for multi-instance deployment with fingerprint-based trust, role hierarchy, and sync flags.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
