## docs

Consolidated documentation is in `docs/` (14 files). See `docs/README.md` for the index. Originals archived at `docs/archive/`.

## enterprise-architecture

ZENOVA follows enterprise-grade architecture patterns. All work must respect these:

### Core vs Feature Modules
- **Core** (never break): auth, RBAC, user/school management, licensing, database, audit logs, notifications
- **Feature Modules** (pluggable, optional): Chapa, Telebirr, NFC, QR, Library, Cafeteria, AI Assistant, SMS Gateway
- Feature modules must never break core. Core cannot import feature modules.

### Feature Flags
- Every optional integration uses a `FEATURE_<NAME>` boolean env var (e.g. `FEATURE_CHAPA=false`)
- Backend: `Settings` class in `backend/app/config.py` — `settings.feature_chapa`
- Frontend: `useFeatures()` hook at `frontend/src/hooks/use-features.ts` fetches flags from `/api/v1/config/features`
- When a feature is disabled, show its menu entry as "Coming Soon" and reject API calls; keep all code present but dormant

### Payment Gateways
- Plugin architecture via `PaymentGatewayFactory` (see ADR-001)
- Currently: Cash, Bank, Telebirr, Chapa (gated behind `FEATURE_CHAPA`)
- New gateways register via `PaymentGatewayFactory.register(name, class)`
- Failure in one gateway must never affect others

### Development Workflow
- `main` — production (never commit directly)
- `develop` — integration branch
- `feature/<name>` — feature branches, merged via PR
- Before any deploy: backup DB, run migrations, run full test suite, health check
- After deploy: run health checks (login, attendance, payments, reports, notifications, dashboard, API, database)
- On failure: rollback immediately via migration downgrade + restore backup

### API Versioning
- `/api/v1/` — stable, never breaking
- New versions get a new prefix (`/api/v2/`), v1 continues serving
- Feature modules add their own router under v1

### Database Migrations
- Never modify DB directly — always use Alembic migrations
- Every migration must be reversible (`downgrade`)
- Migrations run before code deploy, rolled back before code rollback

### Password Recovery (Offline-First)
- No dependency on email/SMS for recovery
- Recovery chain: Super Admin → Recovery Key + 10 Recovery Codes; School Owner → Super Admin; Director/Admin → School Owner; Teacher/Registrar/Staff → Admin; Student → Registrar; Parent → Admin
- Emergency: `sudo zenova-reset-password` on Ubuntu server
- Recovery codes: 10 codes, single-use each, generated at account setup
- Future: add SMS/email/2FA as additional channels when available

### Versioning
- Semantic Versioning (MAJOR.MINOR.PATCH)
- Changelog in `docs/CHANGELOG.md`

### Update Strategy (per School)
1. Download update package
2. Backup database
3. Install update
4. Run database migrations (with rollback)
5. Health check (all systems)
6. Restart services
7. Done — rollback on error

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
