# Disaster Recovery Procedures

## Scope
Covers failure scenarios for single-server and VPS deployments.

## Backup Recovery

### Database
```bash
# Restore from latest backup
pg_restore -h localhost -U zenova -d zenova_db --clean /backups/zenova_20260713_0200.sql

# Point-in-time recovery (if WAL archiving enabled)
pg_rewind --target-pgdata /var/lib/postgresql/data --source-server="host=replica_host"
```

### Application Data
```bash
# server_id.json — re-register via /api/v1/installer/status if lost
# Uploaded files — restore from `/backups/uploads/`
```

## Failure Scenarios

### 1. Database Corruption
1. Stop Zenova: `systemctl stop zenova-backend`
2. Restore from most recent backup (see above)
3. Start Zenova: `systemctl start zenova-backend`
4. Verify: `curl http://localhost:8000/api/v1/health`

### 2. Redis Outage (Graceful Degradation)
- Token blacklisting falls back to in-memory set
- Rate limiting falls back to per-process counters
- License cache falls back to DB reads
- No downtime — some protections weakened until Redis returns

### 3. Disk Full
```bash
df -h
journalctl --vacuum-size=200M
docker system prune -af
# If PostgreSQL WAL grows unchecked:
SELECT pg_wal_replay_resume();
```

### 4. VPS Sync Failure
- Sync queue accumulates entries with status `FAILED`
- Manual retry via admin UI "Sync Queue" page
- If VPS permanently unreachable: deploy new VPS, update URL in Settings

### 5. License Server Unreachable
- Licenses cached in Redis for 30 minutes
- If Redis also down: cached license in server_identity grants 7-day grace
- After grace: read-only mode until license server reachable

## Recovery Testing
Test the following quarterly:
1. DB restore from backup to staging environment
2. Redis shutdown and restart (verify graceful degradation)
3. VPS disconnect/reconnect cycle
