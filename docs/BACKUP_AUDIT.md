# ZENOVA — Backup Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — DevOps Engineer role
**Method:** Static analysis of `backend/app/services/backup_service.py`, `deploy/docker-compose.vps.yml`, `.env.example` settings, restore paths. No code modified.

---

## Executive Summary

ZENOVA's backup service supports `pg_dump` + rotation (hourly→24, daily→30, weekly→12) and optional `age`/`gpg` encryption (off by default). The VPS `backup-worker` container **does not encrypt at all** and stores 7 plaintext dumps on a shared Docker volume. There is **no restore script** in the codebase; restore is manual `psql < file`. No offsite / S3 upload. Encryption is opt-in and required keys are empty by default.

| Question | Answer |
|---|---|
| Can backups be stolen? | **Yes** — VPS backup-worker stores plaintext; default backend config disables encryption |
| Can backups be corrupted? | Partially — no integrity hash; rotation deletes silently if filenames mismatch |
| Can backups be restored successfully? | Manual only — no `restore_backup()` function; no test of restore |
| Are backups retained long enough? | Backend service: 30 daily + 12 weekly ✓; VPS: 7 days ❌ too short for ransomware recovery |

| Score | Dimension | Notes |
|---|---|---|
| 40/100 | Confidentiality | Encryption opt-in + empty default |
| 50/100 | Integrity | No checksum; rotation silent on miss |
| 50/100 | Availability | VPS retention 7 days only; no offsite upload |
| 35/100 | Restore procedure | Manual `psql`; no tested path |
| 65/100 | Backup service logic | Rotation logic well-formed |

---

## §1 — `backup_service.py` (233 lines)

### §1.1 — Encryption (`_encrypt_file` line 64)

```python
def _encrypt_file(file_path: str, key: str) -> str | None:
    if not settings.backup_encrypt_enabled:
        return file_path                              # ← plaintext if disabled
    if shutil.which("age"):
        subprocess.run(["age", "-r", key, "-o", out, in_], check=True)
    elif shutil.which("gpg"):
        subprocess.run(["gpg", "--batch", "--yes",
                         "--passphrase", key,
                         "-c", in_], check=True)
    return out if encrypted else file_path            # falls to plaintext if neither tool installed
```

- Default `BACKUP_ENCRYPT_ENABLED=false` in `.env.example`
- If enabled but no `age`/`gpg` installed → returns plaintext silently (no log)
- If enabled but `BACKUP_ENCRYPTION_KEY` empty → subprocess raises with key as `""` (which would crash backup)

### §1.2 — Rotation (`_apply_rotation` line 166)

Retention pattern: hourly(24) → daily(30) → weekly(12).

```python
hourly_backups = sorted(...);
for old in hourly_backups[24:]:
    os.remove(old);
# daily similar (30), weekly (12)
```

- Logic correct; `MANIFEST_PATH` holds retention metadata
- No integrity hash logged before deletion → silent loss on disk corruption
- Rotation does not log `BACKUP_ROTATED` audit event — admin blind to cleanup action

### §1.3 — Upload (`_upload_to_cloud` line 80)

```python
url = f"{cloud_url.rstrip('/')}/api/v1/upload"
headers = {"Authorization": f"Basic {base64.b64encode(f'{access}:{secret}'.encode()).decode()}"}
resp = urllib.request.urlopen(req, timeout=60)
```

- Uses HTTPS via `urllib.request.Request` — OK if cloud_url is HTTPS
- HTTP Basic Auth over HTTPS — credential in transit OK; not in URL ✓
- No checksum recorded after upload; no S3 / SFTP / SCP alternative
- Silent `return False` on upload failure (`line 110`) — admin not notified

### §1.4 — Backup storage location

`BACKUP_DIR = settings.backup_dir` (defaults to `backend/data/backups/`)

**Bad:** Backups live inside `backend/data/` which is also mounted as a Docker volume. Anyone with read access to the volume = full DB.

---

## §2 — VPS `backup-worker` (`deploy/docker-compose.vps.yml`)

```yaml
backup-worker:
  image: postgres:16-alpine
  environment:
    DATABASE_URL: ${DATABASE_URL}
  command: >
    sh -c "while true; do
      pg_dump -d $DATABASE_URL > /backups/zenova_$(date +%Y%m%d_%H%M).sql;
      find /backups -mtime +7 -delete;
      sleep 86400;
    done"
  volumes:
    - ./backups:/backups
```

| # | Severity | Issue |
|---|---|---|
| B1 | **Critical** | Plaintext `pg_dump` stored on shared Docker volume (`./backups`) — readable by anyone with read access to the host directory |
| B2 | High | 7-day retention only — too short for forensic / ransomware recovery window |
| B3 | High | No encryption hook called even when `BACKUP_ENCRYPT_ENABLED=true` (VPS worker doesn't use `backup_service.py`) |
| B4 | High | No offsite / S3 upload — backups live on the same VPS as the database |
| B5 | Medium | No integrity checksum (sha256) → can't detect partial corruption |
| B6 | Medium | `pg_dump` plain text format (not `--format=custom`) — slow restore, can't selectively restore a single table |
| B7 | Low | File mode default — no `chmod 600` on dump files or `umask 077` instruction in worker |
| B8 | Low | No backup-success alerting (no webhook / email on success OR failure) |

---

## §3 — `deploy/docker-compose.vps.yml` scenario

Imagine the scenario:

1. School deploys ZENOVA on Ubuntu VPS using `deploy/setup-ubuntu.sh` + `deploy/deploy.sh`.
2. `backup-worker` container runs daily; writes plaintext SQL to `./backups/` on host (owned by root, world-readable `644` likely).
3. Attacker compromises a non-root user account (e.g., shell SSH, CVE in companion app) → reads `./backups/*.sql` → has full PII of **all** the school's students, parents, staff, marks, salaries, audit logs.
4. Same attacker deletes `./backups` to cover tracks while keeping the live DB running — ransomware scenario.

**Defense needs:** encryption-at-rest + offsite upload + checksum integrity.

---

## §4 — Recovery / Restore Path

### §4.1 — Backend service: no `restore_backup()` function

`backup_service.py` defines `run_backup()` and `_apply_rotation()` but **no** `restore_backup(filename)` function. The only restore path is manual:

```bash
# operator shell on the VPS:
docker exec -i zenova_db psql -U zenova -d zenova < ./backups/zenova_YYYYMMDD_HHMM.sql
```

- No endpoint `POST /api/v1/backups/{filename}/restore` (confirmed by grep against `endpoints/backup.py`)
- No test of restore procedure
- No recovery runbook officially documented

### §4.2 — Backup download endpoint (`endpoints/backup.py`)

The download route does have a `SAFE_FILENAME = re.compile(r"^[A-Za-z0-9_.-]{1,128}$")` pattern (line 15) — good path-traversal defense for download.

But the prior GLM SECURITY_AUDIT (2026-06-30) found path-traversal in older code. **Verify:** `git log` confirms the regex was added since.

### §4.3 — Recommendations

1. Add `restore_backup(filename)` service function + endpoint `POST /api/v1/backups/{filename}/restore` guarded by `require_permission(LICENSE_MANAGE)` with audit log `BACKUP_RESTORED`.
2. Add a daily `restore-test` worker: spin up ephemeral Postgres, restore latest backup, run `pytest tests/test_smoke.py`, alert on failure. This catches decrypt/restore failures before they're needed for real.
3. Add `sha256sum` after backup; store `*.sha256` next to file; verify before restore.

---

## §5 — Findings Summary

| # | Severity | Finding | File / Source |
|---|---|---|---|
| B1 | **Critical** | VPS backup-worker creates plaintext `pg_dump` on shared volume | `deploy/docker-compose.vps.yml:96-103` |
| B2 | **Critical** | Backend backup encryption disabled by default | `.env.example` (`BACKUP_ENCRYPT_ENABLED=false`) + `backup_service.py:64` |
| B3 | High | No `restore_backup()` function — manual restore only | `backup_service.py` |
| B4 | High | No offsite / S3 upload configured by default | `backup_service.py:80` |
| B5 | High | 7-day retention on VPS — too short | `deploy/docker-compose.vps.yml:99` |
| B6 | Medium | No integrity checksum after backup | `backup_service.py` |
| B7 | Medium | Silent `return False` on upload failure — no alerting | `backup_service.py:110` |
| B8 | Medium | Rotation does not log `BACKUP_ROTATED` audit event | `backup_service.py:166` |
| B9 | Medium | Plain-text `pg_dump` format (use `--format=custom` for selective restore) | VPS worker + service |
| B10 | Medium | Backup lives under `backend/data/` (mounted as Docker volume) — same disk | `backup_service.py` BACKUP_DIR |
| B11 | Low | File mode default (`644`) on backup dumps — should `chmod 600` via `umask 077` | VPS worker |
| B12 | Low | No backup-success / failure webhook alerting | `backup_service.py` |
| B13 | Low | No restore test job in CI / nightly | `tests/` |

---

## §6 — Recommended Hardening Priority

### Phase 1 — Encryption (days)

1. Set `BACKUP_ENCRYPT_ENABLED=true` by default in `.env.example`; document `BACKUP_ENCRYPTION_KEY` generation (`openssl rand -base64 32`).
2. Add `age` package to backup-worker Dockerfile (`alpine: age from edge-testing or `age` standalone binary`).
3. Add `BACKUP_ENCRYPTION_KEY` env injection from K8s Secret / Azure Key Vault (never `.env` plaintext).

### Phase 2 — Off-site + integrity (week)

4. Implement `_upload_to_s3(file_path)` (uses `boto3`); add `BACKUP_S3_BUCKET` setting; upload encrypted file + checksum file.
5. Generate `sha256sum $file > $file.sha256` after every backup; verify before upload/rotation.
6. VPS worker: also call `backup_service.run_backup()` to engage the same logic — not the inline `pg_dump` script.

### Phase 3 — Restore + test (week)

7. Implement `restore_backup(filename)` service function + `POST /api/v1/backups/{filename}/restore` endpoint.
8. Add nightly CI job `restore-and-verify.yml` that creates a throwaway PG, restores latest backup, runs `pytest tests/test_smoke.py`.
9. Document the recovery runbook (`docs/BACKUP_RECOVERY.md`) — operator steps, blast radius, RTO estimates.

### Phase 4 — Retention (days)

10. VPS retention bumped to 30 daily + 12 weekly (matches backend service).
11. Add `--format=custom` (pg_restore selective) for the VPS path.
12. `chmod 600` on backup files via `umask 077` in backup-worker entrypoint.

---

## §7 — Conclusions

Backups today are **adequate as a "restore from yesterday" tool**, not as a recovery mechanism against active attacks (theft, tampering, ransomware). The infra code is clean; the gap is **enabling encryption by default + offsite upload + occasional restore tests**.

**Backup Score: 45/100** — deduct 30 for plaintext default, 15 for no restore procedure, 10 for short retention + no offsite. Award 100 for clean rotation logic.

**End of BACKUP_AUDIT.md**
