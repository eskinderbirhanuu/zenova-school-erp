# ZENOVA Architecture

## Three-Part System

### 1. Control Center (`control-center/`)
**Private** — never distributed to customers.

- Customer management (CRUD for schools)
- License generation (RSA-signed `.lic` files)
- Update server (upload + distribute ERP updates)
- Monitoring (heartbeat from customer servers)
- Analytics dashboard
- Deployment: isolated Docker Compose with its own DB

### 2. School ERP (`school-erp/`)
**Customer-facing** — distributed as Docker images only.

- Pre-built `zenova/backend` and `zenova/frontend` images
- No source code reaches the customer
- Setup wizard for initial configuration
- License validation at startup (pings control center)
- Offline grace period: 45 days

### 3. License Server (`license-server/`)
**Public API** — hosted at superadmin.free.nf.

- Online license validation endpoint
- School registration
- Subscription management

## Build Flow

```
Source Code (backend/, frontend/)
    ↓
school-erp/build.sh
    ↓
Docker Images (zenova/backend:tag, zenova/frontend:tag)
    ↓
release/package-release.sh
    ↓
Customer Package (zenova-1.0.0.zip)
    ├── docker-compose.yml
    ├── .env.example
    ├── nginx.conf
    ├── setup-wizard/
    └── zenova-backend-*.tar.gz  ← no source
    └── zenova-frontend-*.tar.gz ← no source
```

## Customer Installation Flow

```
1. Upload package to server
2. docker load < zenova-backend-*.tar.gz
3. docker load < zenova-frontend-*.tar.gz
4. php -S 0.0.0.0:8080 -t setup-wizard  (or manual .env)
5. docker compose up -d
6. System ready in 2-3 minutes
```

## License Validation

```
School ERP startup
    → reads ZENOVA_LICENSE_KEY
    → POST /api/v1/license/validate
    → Control Center validates key, plan, expiry
    → Returns { valid, plan, seats, expires_at }
    → If offline, uses cached validation (45-day grace)
```
