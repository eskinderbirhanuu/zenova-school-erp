# Developer Onboarding Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12+ | Backend + License Server |
| Node.js | 20+ | Frontend |
| PostgreSQL | 16+ | Main database |
| Redis | 7+ | Caching, sessions, rate limits |
| Docker | 24+ (optional) | Containerized deploy |

## 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux:   source venv/bin/activate
pip install -r requirements.txt
```

**Environment:** Copy config from `.env.example` to `.env`:

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SECRET_KEY
```

**Database:**

```bash
# Create the database
createdb zenova_dev

# Run migrations
alembic upgrade head

# Seed demo data
python scripts/seed_demo.py

# Start dev server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify:** Open http://localhost:8000/docs (Swagger UI).

## 2. License Server Setup (Optional)

```bash
cd license-server
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

## 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local    # if exists, else create:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev                    # starts on http://localhost:3000
```

## 4. Running Tests

```bash
# Backend (173 tests)
cd backend && python -m pytest tests/ -q

# Frontend type check
cd frontend && npx tsc --noEmit
```

## 5. Project Structure

```
zenova/
├── backend/           # FastAPI monolith
│   ├── alembic/       # DB migrations
│   ├── app/
│   │   ├── api/v1/endpoints/   # 50 route files
│   │   ├── core/               # Config, security, middlewares
│   │   ├── models/             # SQLAlchemy models (~110)
│   │   ├── schemas/            # Pydantic request/response
│   │   └── services/           # Business logic (~48)
│   └── tests/
├── frontend/          # Next.js 16
│   └── src/
│       ├── app/           # Pages & layouts
│       ├── components/    # Reusable UI
│       ├── hooks/         # React hooks (use-api, use-toast)
│       └── services/      # API clients, auth context
├── license-server/    # Standalone license validation (FastAPI)
└── deploy/            # Docker Compose, nginx config, secrets template
```

## 6. Common Workflows

### Add a migration

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### Add a new endpoint

1. Create/update schema in `app/schemas/`
2. Add route in `app/api/v1/endpoints/`
3. Add business logic in `app/services/`
4. Add permission in `app/core/permissions.py` if needed
5. Register router in `app/api/v1/router.py`

### Debug queries

```python
# Enable SQL echo in .env
SQL_ECHO=true
```

## 7. Architecture Overview

- **Auth:** JWT access + refresh tokens, optional MFA (TOTP), CSRF via double-submit cookie
- **RBAC:** 32 permissions, 14 roles, `require_permission()` decorator
- **Multi-tenant:** School-scoped via `school_id` on every model
- **NFC:** V2 card system with SHA-256 hashed UIDs, cross-table uniqueness
- **QR:** AES-256-GCM encrypted tokens with HMAC verification
- **Payments:** Chapa gateway integration, idempotency keys, Decimal precision
- **Sync:** Background worker for offline school → cloud sync

## 8. Code Conventions

- **Imports:** stdlib → third-party → local, grouped by blank line
- **Types:** Annotate function signatures; avoid `Any` where possible
- **Services:** No business logic in endpoints — delegate to `app/services/`
- **Audit:** Every state mutation calls `log_audit()` with `school_id`
- **Tests:** pytest with FastAPI TestClient; factories for test data
- **Commits:** Conventional commits (`feat:`, `fix:`, `perf:`, `docs:`, etc.)
