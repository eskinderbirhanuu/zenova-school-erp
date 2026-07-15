# PostgreSQL High Availability — VPS Deployment

## Option 1: Managed DB (Recommended)
Use a managed PostgreSQL provider (AWS RDS, Render, Railway, Supabase) for built-in HA, automated backups, and point-in-time recovery.

## Option 2: Streaming Replication (Self-hosted)

### Primary setup
```bash
# postgresql.conf on primary
wal_level = replica
max_wal_senders = 3
wal_keep_size = 512

# Create replication user
psql -c "CREATE USER replicator WITH REPLICATION PASSWORD 'strong_password';"
```

### Standby setup
```bash
pg_basebackup -h primary_host -U replicator -D /var/lib/postgresql/data -P -R
# Add to postgresql.conf on standby:
primary_conninfo = 'host=primary_host port=5432 user=replicator password=strong_password'
```

### Docker Compose (two-node)
```yaml
services:
  db-primary:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: zenova
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: zenova_prod
    volumes:
      - pgdata-primary:/var/lib/postgresql/data
    healthcheck:
      test: pg_isready -U zenova

  db-replica:
    image: postgres:16-alpine
    environment:
      PG_PRIMARY: db-primary
      PG_PRIMARY_USER: replicator
      PG_PRIMARY_PASSWORD: ${REPLICA_PASSWORD}
    depends_on:
      db-primary:
        condition: service_healthy
    volumes:
      - pgdata-replica:/var/lib/postgresql/data

volumes:
  pgdata-primary:
  pgdata-replica:
```

### Patroni (production-grade)
For automatic failover, wrap PostgreSQL with Patroni + etcd/consul:
```bash
docker run --name etcd -d -p 2379:2379 gcr.io/etcd-development/etcd
patroni patroni.yml  # on each node
```
See [patroni.readthedocs.io](https://patroni.readthedocs.io/).
