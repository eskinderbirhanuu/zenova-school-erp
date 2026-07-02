# ZENOVA Codebase Review Report

## Executive Summary

The current backend is functional but not yet production-ready. The most important issues are:

- startup uses schema creation instead of migrations
- configuration is weak and hard-coded for development
- database access patterns are not optimized for scale
- some service code performs expensive repeated queries and commits
- Docker and PostgreSQL settings are not tuned for production
- security controls are present but still incomplete in deployment and configuration

Editor diagnostics reported no current syntax errors in the backend workspace.

---

## High-Priority Findings

### 1) Startup creates tables directly instead of using migrations

- Problem: The application creates all database tables at startup in [backend/app/main.py](backend/app/main.py), bypassing Alembic-controlled schema evolution.
- Root Cause: The app uses `Base.metadata.create_all(bind=engine)` during startup, which is fine for local dev but dangerous in production because it can drift from migrations and cause inconsistent schema states.
- Severity: High
- Code Fix: Remove automatic schema creation from application startup. Run migrations explicitly in deployment and keep startup focused on health checks and bootstrapping.
- Refactored Version:

```python
# backend/app/main.py
@app.on_event("startup")
def startup():
    from app.core.bootstrap import ensure_service_dependencies
    ensure_service_dependencies()
```

```bash
# deployment
alembic upgrade head
```

- Performance Gain: Lower startup latency and fewer unexpected lock/contention events during boot.
- Best Practice: Treat migrations as the source of truth for schema changes.

### 2) Weak and hard-coded configuration defaults

- Problem: The app ships with default secrets and local-only URLs in [backend/app/config.py](backend/app/config.py).
- Root Cause: Defaults like `dev-secret-key`, local Postgres and Redis URLs, and permissive CORS values are used when environment variables are not set.
- Severity: High
- Code Fix: Fail fast in production unless required environment variables are provided. Use a strict settings layer and separate env files per environment.
- Refactored Version:

```python
# backend/app/config.py
class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    environment: str = "production"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    def validate(self) -> None:
        if self.is_production and self.secret_key in {"", "dev-secret-key"}:
            raise RuntimeError("SECRET_KEY must be set in production")
```

- Performance Gain: Prevents accidental deployment misconfiguration and reduces operational firefighting.
- Best Practice: Use environment-specific configuration, secrets managers, and fail-fast validation.

### 3) Database sessions are created without pooling tuning

- Problem: The SQLAlchemy engine in [backend/app/database.py](backend/app/database.py) uses default pool settings.
- Root Cause: No pool size, max overflow, or recycle settings are configured for production workloads.
- Severity: Medium
- Code Fix: Tune connection pool settings based on expected concurrency and use `pool_pre_ping=True`.
- Refactored Version:

```python
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=10,
    max_overflow=20,
)
```

- Performance Gain: Better connection reuse and fewer connection storms under load.
- Best Practice: Tune DB connection pools per workload rather than using framework defaults.

### 4) Repeated and expensive queries in finance and student services

- Problem: Services such as [backend/app/services/finance_service.py](backend/app/services/finance_service.py) and [backend/app/services/student_service.py](backend/app/services/student_service.py) perform repeated DB lookups and large object loads without pagination or selective loading.
- Root Cause: Calls to `db.query(...).first()` and `db.query(...).all()` are repeated inside loops and list operations without joins or constraints.
- Severity: High
- Code Fix: Use eager loading where needed, prefetch related data, and paginate list endpoints.
- Refactored Version:

```python
from sqlalchemy.orm import selectinload

q = (
    db.query(Student)
    .options(selectinload(Student.parents))
    .filter(Student.deleted_at.is_(None))
)
```

```python
# list endpoint
limit = min(limit, 200)
```

- Performance Gain: Fewer round-trips and lower memory usage for list endpoints.
- Best Practice: Use query optimization, pagination, and selective eager loading.

### 5) Audit logging commits on every write

- Problem: The audit helper in [backend/app/core/audit.py](backend/app/core/audit.py) commits immediately, which can interfere with transaction boundaries and slow down write-heavy flows.
- Root Cause: Each audit write opens and commits its own transaction, increasing DB pressure and making multi-step writes brittle.
- Severity: Medium
- Code Fix: Add audit rows as part of the surrounding transaction and flush them, rather than committing independently.
- Refactored Version:

```python
def log_audit(db, ...):
    audit = AuditLog(...)
    db.add(audit)
    db.flush()
    return audit
```

- Performance Gain: Fewer transactions and better write throughput.
- Best Practice: Keep business and audit writes inside a single transaction when possible.

### 6) Authentication and rate limiting rely on Redis but lack robust fallback

- Problem: Redis-dependent auth and rate limiting code in [backend/app/api/v1/deps.py](backend/app/api/v1/deps.py) and [backend/app/api/v1/endpoints/auth.py](backend/app/api/v1/endpoints/auth.py) silently fail open on exceptions.
- Root Cause: The code catches broad exceptions and passes, which weakens security and makes abuse protection ineffective.
- Severity: High
- Code Fix: Use a safe fallback strategy, such as in-memory counters for single-instance deployments or a clear startup failure when Redis is required.
- Refactored Version:

```python
try:
    redis = get_redis()
    ...
except Exception as exc:
    logger.warning("Redis unavailable for rate limiting: %s", exc)
    raise HTTPException(503, "Rate limiting unavailable")
```

- Performance Gain: More predictable behavior under failure and fewer abuse bypasses.
- Best Practice: Make security controls fail closed or explicitly degrade with monitoring.

### 7) Large import chain and heavy startup cost

- Problem: [backend/app/models/__init__.py](backend/app/models/__init__.py) imports a very large set of models, increasing startup time and coupling modules together.
- Root Cause: The package imports most of the domain model hierarchy eagerly, which is expensive and fragile for large applications.
- Severity: Medium
- Code Fix: Prefer explicit imports in modules that need them and reduce cross-module coupling.
- Refactored Version:

```python
# in each service module, import only the models required
from app.models.student import Student
from app.models.parent import Parent
```

- Performance Gain: Faster cold starts and lower memory overhead.
- Best Practice: Keep module imports narrow and explicit.

### 8) Docker and deployment configuration are not production-hardened

- Problem: [docker-compose.yml](docker-compose.yml), [backend/docker-compose.yml](backend/docker-compose.yml), and [backend/Dockerfile](backend/Dockerfile) are set up for development convenience rather than production reliability.
- Root Cause: Containers expose development ports, use weak defaults, lack resource limits, and do not enforce strict environment handling.
- Severity: High
- Code Fix: Separate development and production Compose files, set resource limits, use secrets, and ensure health checks are reliable.
- Refactored Version:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
    environment:
      ENVIRONMENT: production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

- Performance Gain: Better stability and lower risk of container resource exhaustion.
- Best Practice: Use production-ready Compose files, health checks, resource limits, and secrets.

### 9) PostgreSQL schema design needs stronger constraints and indexing

- Problem: Many tables use string identifiers and soft-delete patterns but lack composite indexes for the common query paths.
- Root Cause: Models such as [backend/app/models/student.py](backend/app/models/student.py), [backend/app/models/audit_log.py](backend/app/models/audit_log.py), and [backend/app/models/payment.py](backend/app/models/payment.py) define important fields but do not fully optimize them for frequent filters and joins.
- Severity: Medium
- Code Fix: Add indexes for `school_id`, `deleted_at`, `status`, `student_id`, `invoice_id`, and audit search paths. Consider `citext` for case-insensitive text or database-level constraints for important business rules.
- Refactored Version:

```python
from sqlalchemy import Index

Index("ix_students_school_status", Student.school_id, Student.status)
Index("ix_audit_school_table", AuditLog.school_id, AuditLog.table_name)
```

- Performance Gain: Faster filtering and reporting on large datasets.
- Best Practice: Index based on real query patterns, not only primary keys.

### 10) Security posture is incomplete for production deployment

- Problem: The app uses security headers and middleware in [backend/app/main.py](backend/app/main.py), but deployment still needs stronger controls such as HTTPS-only cookies, secret rotation, and stricter CORS.
- Root Cause: The current setup is partially hardened but still relies on default environment values and local dev origins.
- Severity: Medium
- Code Fix: Enforce `Secure`, `HttpOnly`, `SameSite=Lax/Strict` cookies, restrict origins explicitly, and rotate secrets through a secret manager.
- Refactored Version:

```python
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,
    secure=True,
    samesite="lax",
)
```

- Performance Gain: Fewer security incidents and lower support burden.
- Best Practice: Secure-by-default settings and environment-driven policies.

---

## Improved Architecture

A stronger target architecture would be:

- API layer: FastAPI routers and schema validation
- Domain services: business logic isolated from HTTP concerns
- Repository layer: DB access abstraction for future migration away from SQLAlchemy
- Infrastructure layer: Redis, email, licensing, file storage, background jobs
- Observability layer: structured logging, metrics, tracing, and alerting

Recommended split:

```text
backend/
  app/
    api/
      v1/
        endpoints/
        deps.py
        router.py
    core/
      config/
      security/
      observability/
    domain/
      auth/
      students/
      finance/
      hr/
      inventory/
      communications/
    infrastructure/
      db/
      redis/
      mail/
      storage/
    schemas/
    services/
    workers/
```

---

## Recommended Folder Structure

```text
backend/
  alembic/
  app/
    api/
      v1/
        endpoints/
    core/
    domain/
    infrastructure/
    schemas/
    services/
    tests/
  scripts/
  tests/
frontend/
  src/
    app/
    components/
    hooks/
    lib/
    services/
```

---

## Production Checklist

- [ ] Move secrets to a secrets manager
- [ ] Disable docs in production
- [ ] Enforce HTTPS and secure cookies
- [ ] Restrict CORS to known origins
- [ ] Run Alembic migrations on deploy
- [ ] Enable DB backups and PITR
- [ ] Add rate limiting and abuse detection
- [ ] Add audit retention and export policy
- [ ] Enable Sentry or equivalent error tracking
- [ ] Add health and readiness probes

---

## DevOps Checklist

- [ ] Separate `docker-compose.dev.yml` and `docker-compose.prod.yml`
- [ ] Add resource limits and restart policies
- [ ] Use health checks for DB, Redis, backend, and frontend
- [ ] Use managed PostgreSQL in production
- [ ] Set up automated DB migration pipelines
- [ ] Add CI/CD tests for API and data integrity
- [ ] Configure log aggregation and metrics
- [ ] Use container image signing and vulnerability scanning

---

## Performance Checklist

- [ ] Add pagination to list endpoints
- [ ] Optimize N+1 queries with joins or eager loading
- [ ] Add database indexes for hot paths
- [ ] Tune SQLAlchemy pool settings
- [ ] Cache frequently read data in Redis
- [ ] Compress large API responses and use pagination
- [ ] Monitor p95 latency and DB load
- [ ] Add async workers for background jobs

---

## Recommended Priority Order

1. Replace startup table creation with Alembic migration enforcement
2. Remove hard-coded secrets and enforce environment validation
3. Add pagination and query optimization for student/finance listing APIs
4. Harden Redis and auth failure handling
5. Separate development and production Docker settings
6. Add index tuning and database connection pool optimization
