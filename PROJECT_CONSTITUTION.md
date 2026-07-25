# ZENOVA SCHOOL ERP

## Enterprise Architecture Constitution

**Version:** 1.0.0  
**Status:** Official Engineering Constitution  
**Last Updated:** 2026-07-25  
**Applies To:** All engineers, AI agents, and contributors working on ZENOVA

---

## Preamble

ZENOVA is an enterprise-grade School Management Platform designed for small schools through international multi-campus institutions. This constitution governs every engineering decision, architectural choice, and commercial practice. Every contributor — human or AI — must read and abide by this document before making any modification to the project.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Product Structure](#2-product-structure)
3. [Deployment Philosophy](#3-deployment-philosophy)
4. [Local Deployment](#4-local-deployment)
5. [Cloud Deployment](#5-cloud-deployment)
6. [Hybrid Mode](#6-hybrid-mode)
7. [License System](#7-license-system)
8. [Organization Engine](#8-organization-engine)
9. [Permission Engine](#9-permission-engine)
10. [Dashboard Engine](#10-dashboard-engine)
11. [User Experience](#11-user-experience)
12. [Security](#12-security)
13. [Database](#13-database)
14. [API Standards](#14-api-standards)
15. [Offline First](#15-offline-first)
16. [AI Engineering Rules](#16-ai-engineering-rules)
17. [Code Quality](#17-code-quality)
18. [Commercial Rules](#18-commercial-rules)
19. [Update Strategy](#19-update-strategy)
20. [Future Expansion](#20-future-expansion)
21. [Engineering Principle](#21-engineering-principle)
22. [Session Protocol](#22-session-protocol)
23. [Architecture Enforcement](#23-architecture-enforcement)
24. [Crisis Protocol](#24-crisis-protocol)

---

## 1. Project Vision

ZENOVA is an Enterprise Education Platform designed for:

- Small Schools
- Medium Schools
- Large Schools
- Multi-Campus Schools
- International Schools

The system must remain scalable for the next 10+ years.

Every engineering decision must prioritize:

- **Maintainability** — Code must be readable, modular, and well-documented
- **Security** — Every layer must be hardened by default
- **Scalability** — Architecture must support growth without redesign
- **Performance** — Response times must be predictable under load
- **Reliability** — The system must function without unexpected downtime
- **User Experience** — Every screen must be fast, modern, and intuitive

**Never build temporary solutions.** Every line of code is a long-term asset.

---

## 2. Product Structure

ZENOVA consists of **two independent products** built from a **single codebase**.

### Product A — ZENOVA Control Center

**Owned exclusively by ZENOVA. Never shipped to customers.**

```
control-center/
├── backend/        — FastAPI: customer, license, update, monitoring APIs
├── frontend/       — Next.js: admin dashboard
└── docker-compose.yml
```

**Responsibilities:**
- Customer Management (CRUD for schools)
- License Generation & Management (RSA-signed `.lic` files)
- Update Server (upload + distribute ERP versions)
- Remote Support & Monitoring (heartbeat from customer servers)
- Analytics Dashboard (usage, performance, errors)
- Subscription & Billing Management
- Audit log browsing for all customer systems

### Product B — ZENOVA School ERP

**Delivered to schools as pre-built Docker images only.**

```
school-erp/
├── docker-compose.yml     — Pre-built image deployment
├── .env.example           — Environment template
├── nginx.conf             — Reverse proxy with WebSocket support
├── setup-wizard/          — PHP browser-based configuration
└── build.sh               — Builds images from source (internal use)
```

**Contains:**
- Student Management (registration, profiles, documents, transfers)
- Teacher Management (profiles, assignments, schedules)
- Parent Portal (communication, fee tracking, progress reports)
- Finance (fee management, invoicing, payments, receipts, accounting)
- Attendance (daily, per-class, auto-reporting)
- Examination (exam creation, grading, report cards, transcripts)
- Library (catalog, check-in/check-out, fines)
- Clinic (student health records, visits, immunizations)
- Store (inventory, sales, stock management)
- Reports (academic, financial, operational, custom)
- Notifications (in-app, SMS, email gateway)
- Organization Management (departments, roles, permissions)

**Constraint:** School ERP must work independently after activation. License validation is the only external dependency, and it has a 45-day offline grace period.

---

## 3. Deployment Philosophy

**Never maintain two separate codebases.** Maintain one codebase. Support three deployment modes.

```
┌─────────────────────────────────────────────┐
│              ONE CODEBASE                    │
│         backend/ + frontend/                │
└─────────────────────────────────────────────┘
                      │
     ┌────────────────┼────────────────┐
     ▼                ▼                ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  Local   │   │  Cloud   │   │  Hybrid  │
│  Docker  │   │  VPS/VM  │   │  Both    │
│  LAN     │   │  HTTPS   │   │  Best    │
└──────────┘   └──────────┘   └──────────┘
```

**Deployment mode is determined by configuration.** Business logic must never change between modes. The same Docker image runs everywhere — only environment variables differ.

---

## 4. Local Deployment

**Target:** Schools with no Internet or limited connectivity.

**Stack:**
- Ubuntu Server 22.04+ (or Windows Server with Docker Desktop)
- Docker Engine 24+ and Docker Compose v2
- Nginx reverse proxy (inside Docker)
- 4 GB RAM minimum, 8 GB recommended
- 20 GB free disk space

**Access:**
- LAN: `http://192.168.x.x`
- Local DNS: `http://zenova.local`
- Every device on the same network must reach the login page

**Setup Script:** `deploy/setup-ubuntu.sh` installs Docker, creates systemd service, configures firewall and static IP, loads pre-built images.

**Constraint:** The system must continue functioning **without any Internet access** after initial activation. All features except license validation (which has a 45-day grace period) must work offline.

---

## 5. Cloud Deployment

**Target:** Schools with reliable Internet or centralized hosting.

**Stack:**
- VPS, Dedicated Server, or Cloud VM (Ubuntu 22.04+)
- Docker + Docker Compose
- Nginx reverse proxy with SSL termination
- Certbot for Let's Encrypt auto-renewal
- Optional: Load balancer for multi-server setups

**Deployment Script:** `deploy/deploy.sh school` loads pre-built images, configures self-signed certs (replaceable with Let's Encrypt), starts services, runs migrations.

**Control Center Cloud:** `deploy/deploy.sh cc` deploys the private admin panel on a separate, restricted VPS.

---

## 6. Hybrid Mode

**Preferred deployment strategy for most schools.**

**Local execution:**
- All daily operations run on the school's local server
- Full functionality during Internet outages
- Low latency for all user interactions

**Cloud responsibilities:**
- Automated off-site backups (encrypted)
- License validation and renewal
- Update distribution and staged rollouts
- Optional: centralized data synchronization for multi-campus schools
- Remote support tunnel (initiated by school server, outbound only)

**Principle:** Internet should enhance the system, not be required for daily work.

---

## 7. License System

### 7.1 License Types

Exactly two license types exist.

#### School License

Issued to paying customers.

```
ZNV-XXXXXXXX-XXXXXXXX-XXXXXXXX
```

**Contains:**
- School ID (unique identifier)
- School Name
- Plan (Standard, Premium, Enterprise)
- Student Limit (max active students)
- Branch Limit (max campuses)
- Expiration Date
- Hardware Binding (machine fingerprint)
- Offline Grace Period (45 days from last validation)
- RSA Signature (prevents forgery)

**Validation Flow:**
```
School ERP startup
  → reads ZENOVA_LICENSE_KEY
  → POST /api/v1/license/validate to Control Center
  → Control Center validates key, plan, expiry, hardware
  → Returns { valid, plan, seats, expires_at }
  → If offline: cached validation (45-day grace)
  → If expired: restricted mode (data access only, no modifications)
```

#### ZENOVA Company License

**Internal only. Never exposed to customers.**

Used for:
- Control Center access
- License signing authority
- Update package signing
- Remote support authentication

### 7.2 License Generation

Licenses are generated via the Control Center (`/api/v1/licenses`):
1. Admin selects customer and plan
2. System generates unique key with embedded metadata
3. System signs the license with the RSA private key
4. License is delivered to customer (download or email)
5. Customer enters key in School ERP setup wizard

### 7.3 Recovery Codes

Every school account has 10 single-use recovery codes generated at setup, stored as bcrypt hashes. Used for password recovery when offline.

---

## 8. Organization Engine

**Never hardcode organizational roles.** Everything must be configurable without source code changes.

### 8.1 Hierarchy

```
Organization
  └── Departments (configurable: Academic, Finance, Admin, etc.)
        └── Roles (configurable: Director, Teacher, Cashier, etc.)
              └── Permissions (granular, action-based)
                    └── Users (belong to roles)
```

### 8.2 Rules

- Schools create departments through the UI — no code changes
- Roles are defined per-department with granular permissions
- A user can hold multiple roles across departments
- Adding a new role must never require creating new dashboards or pages
- The system ships with sensible defaults but allows full customization

### 8.3 Default Roles

| Role | Scope | Default Permissions |
|------|-------|-------------------|
| Director | All | Full access to all modules |
| Vice Director | All | Read + limited write |
| Department Head | Department | Full access to department |
| Teacher | Department | Class, grade, attendance |
| Cashier | Finance | Payments, receipts |
| Registrar | Academic | Enrollment, records |
| Secretary | Admin | Scheduling, communication |
| Parent | Student | View own children only |
| Student | Self | View own records |

---

## 9. Permission Engine

**Dashboards must never depend on roles. Dashboards must depend on permissions.**

### 9.1 Permission Structure

Every permission is an action on a resource:

```
{resource}:{action}
```

**Resources:** `students`, `teachers`, `classes`, `fees`, `attendance`, `exams`, `library`, `clinic`, `store`, `reports`, `settings`, `users`, `roles`, `departments`

**Actions:** `create`, `read`, `update`, `delete`, `approve`, `export`, `import`, `manage`

**Examples:**
- `students:create` — Can register new students
- `fees:read` — Can view fee records
- `reports:export` — Can export reports
- `users:manage` — Can manage user accounts

### 9.2 What Permissions Control

- **Navigation** — Menu items and sidebar links
- **Pages** — Full page access
- **Widgets** — Dashboard widget visibility
- **Buttons** — Action button visibility and enablement
- **APIs** — Backend endpoint access (enforced server-side)
- **Reports** — Report generation and export
- **Data** — Row-level data access (e.g., own department only)

### 9.3 Enforcement

Permissions are enforced at **three layers**:
1. **Frontend:** UI elements hidden/disabled
2. **Backend API:** Middleware validates permissions before any operation
3. **Database:** Queries filter results based on permission scope

---

## 10. Dashboard Engine

**One adaptive dashboard. Never create role-specific dashboards.**

### 10.1 How It Works

```
User Logs In
  → System loads user's permissions
  → Dashboard engine queries available widgets
  → Renders only widgets the user can access
  → Layout adapts to widget count and type
```

### 10.2 Widget System

- Widgets are independent React components
- Each widget declares its required permissions
- Widgets can be configured (position, size, refresh interval)
- Users can customize their own dashboard layout (persisted per user)
- New widgets can be added without modifying existing dashboards

### 10.3 Prohibited

- ❌ Never create `FinanceDashboard.tsx`, `TeacherDashboard.tsx`, `CashierDashboard.tsx`
- ✅ Create `DashboardPage.tsx` with a dynamic widget grid

---

## 11. User Experience

### 11.1 Design Principles

Every screen must be:
- **Fast** — Initial load under 2 seconds, interactions under 200ms
- **Modern** — Current design language, clean aesthetics
- **Accessible** — WCAG 2.1 AA minimum, keyboard navigable, screen-reader friendly
- **Responsive** — Desktop, tablet, and mobile (1024px–2560px)
- **Consistent** — One design system, same patterns everywhere
- **Intuitive** — Users should not need training for basic tasks

### 11.2 Design System

- Color palette: Professional, accessible contrast ratios
- Typography: System font stack for performance
- Spacing: 4px grid system, consistent padding/margins
- Components: Shared component library, no ad-hoc styling
- Icons: One icon set throughout the application

### 11.3 Prohibited

- ❌ Visual clutter, unnecessary animations, inconsistent spacing
- ❌ Mixing multiple design languages
- ❌ Templates that look like generic admin panels
- ❌ Hard-to-read text (small fonts, low contrast)

---

## 12. Security

**Security must never be optional.** Every layer is hardened by default.

### 12.1 Mandatory Controls

| Control | Implementation |
|---------|---------------|
| RBAC | Permission-based, enforced server-side |
| Audit Logs | Every mutation logged with timestamp, user, IP, action |
| Password Hashing | bcrypt with work factor 12+ |
| JWT Security | Short-lived access tokens (15min), refresh tokens (7d), HTTP-only cookies |
| Rate Limiting | 30 req/s per IP on API, 5 req/s on auth endpoints |
| Input Validation | Pydantic v2 schemas on all endpoints |
| Encryption | AES-256-GCM for sensitive data at rest, TLS 1.3 in transit |
| Secrets Management | Environment variables only, never in code or config files |
| CSRF Protection | Double-submit cookie pattern with HMAC comparison |
| CSP | Strict Content-Security-Policy headers |
| HSTS | Enabled on all HTTPS deployments |

### 12.2 File Upload Security

- Allowed extensions: whitelist only (pdf, jpg, png, gif, doc, docx, xls, xlsx, csv, txt)
- MIME type validation (server-side, not client-side)
- Maximum file size: 10 MB per file
- Upload directory: outside web root, served through authenticated endpoint
- File names: UUID-based, never user-supplied

### 12.3 Authentication

- Login: email/phone + password
- MFA-ready architecture (TOTP implementation prepared, not yet activated)
- Password recovery: offline-first chain (see AGENTS.md)
- Session invalidation on password change
- Concurrent session limit: configurable (default: 5)

### 12.4 Secrets That Must NEVER Be in Code

- ❌ Database passwords
- ❌ JWT secret keys
- ❌ License signing keys
- ❌ API keys for external services
- ❌ Encryption keys
- ❌ SMTP credentials
- ❌ Recovery codes (stored as bcrypt hashes only)

---

## 13. Database

### 13.1 Principles

- Schema must remain **normalized** (3NF minimum)
- Never duplicate data unnecessarily
- Use **Alembic migrations** for all structural changes
- Every migration must be **reversible** (downgrade)
- Migrations run before code deploy, rolled back before code rollback
- Support future expansion without redesign

### 13.2 Naming Conventions

- Tables: `snake_case`, plural (e.g., `students`, `fee_payments`)
- Columns: `snake_case` (e.g., `created_at`, `student_id`)
- Primary keys: `id` (auto-incrementing or UUID as needed)
- Foreign keys: `{referenced_table}_id` (e.g., `student_id`, `class_id`)
- Indexes: `ix_{table}_{column}` (e.g., `ix_fee_payments_paid_at`)
- Timestamps: `created_at`, `updated_at` on every table

### 13.3 Enforcement

- All queries use parameterized statements (SQLAlchemy ORM)
- No raw SQL unless absolutely necessary for performance
- N+1 query patterns are prohibited — use eager loading
- Large tables (>100K rows) must have appropriate composite indexes
- Full-text search uses PostgreSQL `tsvector` columns

---

## 14. API Standards

### 14.1 Versioning

- `/api/v1/` — stable, never breaking
- New versions get a new prefix (`/api/v2/`), v1 continues serving
- Feature modules add their own router under v1

### 14.2 Response Format

**Success:**
```json
{
  "data": { ... },
  "meta": { "page": 1, "per_page": 50, "total": 100 }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [ ... ]
  }
}
```

**Error Codes:** `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `INTERNAL_ERROR`, `LICENSE_EXPIRED`, `FEATURE_DISABLED`

### 14.3 Pagination

- Cursor-based for real-time feeds and activity logs
- Offset-based for static lists with page numbers
- Default page size: 50, Max: 200

### 14.4 Authentication

- JWT Bearer token in `Authorization` header
- Endpoints under `/api/v1/auth/*` are public
- All other endpoints require authentication
- License validation endpoint is publicly accessible (POST)

---

## 15. Offline First

**School ERP must remain fully operational without Internet.**

### 15.1 Offline Capabilities

- All CRUD operations work offline
- Reports generate offline
- Attendance recording offline
- Examination administration offline
- Fee recording offline (syncs when online)
- License validation cached with 45-day grace period

### 15.2 Online Enhancements

- License validation (renewal, hardware check)
- Updates (download and staged rollout)
- Off-site backups
- Multi-campus sync
- Remote support tunnel
- SMS/email gateway

### 15.3 Design Principle

Internet should enhance the system, not be required for daily work. All features must have an offline path.

---

## 16. AI Engineering Rules

### 16.1 Before Making Changes

When an AI agent (DeepSeek, Claude, GPT, etc.) is asked to work on ZENOVA:

1. **Read the Constitution** — This document must be loaded first
2. **Read AGENTS.md** — Project-specific agent instructions
3. **Read the Knowledge Graph** — Use `graphify query` for architecture questions
4. **Understand the Full Architecture** — Never modify code without seeing the whole picture
5. **Check Feature Flags** — `FEATURE_*` env vars control optional modules
6. **Respect Module Boundaries** — Core never imports feature modules

### 16.2 During Changes

- Fix issues automatically when safe (lint, types, imports, dead code)
- Never perform irreversible operations without confirmation (DB drops, key regeneration, data deletion)
- Never commit secrets, keys, or passwords
- Preserve backward compatibility
- Generate Markdown reports for every engineering session

### 16.3 After Changes

1. Run `graphify update .` to keep the knowledge graph current
2. Run lint and typecheck commands
3. Run relevant tests
4. Verify no broken imports or dead code
5. Report: What changed, why, files modified, architecture/security/performance improvements

---

## 17. Code Quality

### 17.1 Mandatory Practices

- **Clean Architecture** — Separation of concerns: models, schemas, services, endpoints
- **SOLID Principles** — Single responsibility, open-closed, Liskov substitution, interface segregation, dependency inversion
- **Consistent Naming** — Descriptive, searchable, follow language conventions
- **No Duplicated Logic** — Extract shared code into services or utilities
- **No Dead Code** — Remove unused imports, variables, functions, files
- **No Broken Imports** — Every import must resolve
- **Type Hints** — Python: full type annotations. TypeScript: strict mode.
- **Error Handling** — Every exception caught or explicitly propagated, no silent failures

### 17.2 File Organization

```
{module}/
├── __init__.py
├── models.py        — SQLAlchemy models (data layer)
├── schemas.py       — Pydantic schemas (validation layer)
├── service.py       — Business logic (service layer)
├── endpoints.py     — FastAPI routes (presentation layer)
└── test_*.py        — Tests (test layer)
```

### 17.3 Code Review Checklist

- [ ] Does the code follow the project's architecture?
- [ ] Are there security vulnerabilities?
- [ ] Is there duplicated logic?
- [ ] Are error cases handled?
- [ ] Are there proper type hints?
- [ ] Are there tests for new functionality?
- [ ] Is backward compatibility preserved?
- [ ] Are secrets or credentials exposed?
- [ ] Are feature flag checks in place?

---

## 18. Commercial Rules

### 18.1 What Customers Receive

- ZENOVA School ERP Docker images (pre-built, no source code)
- `docker-compose.yml`
- `.env.example`
- `nginx.conf`
- Setup wizard (`setup-wizard/`)
- Customer documentation (`school-erp/README.md`)

### 18.2 What Customers NEVER Receive

- ❌ ZENOVA Control Center (any part)
- ❌ Internal source code (`backend/`, `frontend/`)
- ❌ License signing keys
- ❌ Commercial secrets and business logic
- ❌ Internal monitoring tools
- ❌ Database migration scripts (Alembic runs inside container)
- ❌ Internal documentation

### 18.3 Distribution Method

- Docker images only (pushed to private registry or shipped as `.tar.gz`)
- No source code access — images are production-only
- License key activates the system
- Updates distributed as new Docker images

### 18.4 Enforcement

- `.gitignore` excludes keys, secrets, and build artifacts
- `release/package-release.sh` strips all source code before packaging
- Docker images are multi-stage: builder stage is discarded
- Control Center and School ERP run on completely separate infrastructure

---

## 19. Update Strategy

### 19.1 Update Flow (Per School)

1. Control Center admin uploads new version (`/api/v1/updates`)
2. School ERP checks for updates (configurable interval, default: daily)
3. Update package downloaded: new Docker images + migration scripts
4. **Pre-deployment:**
   - Backup database
   - Verify disk space
   - Check current version compatibility
5. **Deployment:**
   - Load new Docker images
   - Run database migrations (with rollback capability)
   - Restart services progressively
6. **Post-deployment:**
   - Health check: login, attendance, payments, reports, notifications, dashboard, API, database
   - Verify all modules functional
   - Report success to Control Center
7. **On failure:**
   - Rollback immediately: migration downgrade + restore backup
   - Report failure details to Control Center
   - Notify school admin with recovery instructions

### 19.2 Update Package Structure

```
zenova-1.1.0/
├── zenova-backend-1.1.0.tar.gz
├── zenova-frontend-1.1.0.tar.gz
├── migrations/         — Alembic migration scripts
├── upgrade.sh          — Automated upgrade script
├── rollback.sh         — Automated rollback script
├── checksums.txt       — SHA-256 checksums
└── CHANGELOG.md        — What changed
```

### 19.3 Rules

- Every update must be **backward compatible** (schema, API, data format)
- Every update must have a **rollback path**
- Updates can be **mandatory** (security patches) or **optional** (feature releases)
- Mandatory updates are enforced by the license server
- Versioning follows Semantic Versioning (MAJOR.MINOR.PATCH)

---

## 20. Future Expansion

### 20.1 Module Architecture

The architecture must support future modules without major redesign:

| Module | Integration Point |
|--------|------------------|
| Transport | Student module + fee module |
| Hostel | Student module + inventory module |
| Payroll | Finance module + organization module |
| Learning Management (LMS) | Student + Teacher + Examination |
| AI Assistant | All modules (separate service) |
| Document Management | File upload service |
| Online Admissions | Student module + payment gateway |
| Digital Library | Library module + search service |
| SMS/Email Gateway | Notification module (pluggable) |
| Mobile App | REST API (existing) + WebSocket |
| Biometric Integration | Attendance module (pluggable) |

### 20.2 How to Add a Module

1. Create directory: `backend/app/api/v1/endpoints/{module}/`
2. Register router in `backend/app/api/v1/router.py`
3. Add feature flag: `FEATURE_{MODULE}` env var
4. Create frontend directory: `frontend/src/app/{module}/`
5. Add menu entry with feature flag check
6. Register in useFeatures() hook
7. Write database migrations (reversible)
8. Create tests
9. Update documentation

### 20.3 Constraint

**No architectural rewrite should be required.** If adding a module requires modifying core code, the architecture needs improvement first.

---

## 21. Engineering Principle

**Never rewrite a working system.**

```
❌ "Let's rewrite this in the new framework"
❌ "This works but let's rebuild it properly"
❌ "The old code is messy, let's start over"

✅ "Let's refactor this module incrementally"
✅ "Let's extract this into a standalone service"
✅ "Let's add tests before modifying this path"
✅ "Let's extend without breaking existing contracts"
```

**Improve through modular extensions.** Protect backward compatibility. Optimize continuously. Think like a long-term enterprise software company — not a short-term project.

---

## 22. Session Protocol

Every engineering session must follow this protocol:

### 22.1 Session Start

```
1. Load PROJECT_CONSTITUTION.md
2. Load AGENTS.md
3. Check graphify-out/ for existing graph
4. Read git log --oneline -10 for context
5. Load docs/ARCHITECTURE.md for current state
6. Understand the task in context of the full project
```

### 22.2 Session Execution

```
1. Analyze before coding
2. Make minimal, safe changes
3. Test each change
4. Run lint + typecheck
5. Update knowledge graph: graphify update .
6. Commit with descriptive message
```

### 22.3 Session End — Must Generate Markdown Report

Every session produces a report containing:

- **Objective** — What was requested
- **Changes Made** — Files modified, added, deleted
- **Rationale** — Why each change was made
- **Architecture Impact** — Any structural changes
- **Security Impact** — Any security improvements or considerations
- **Performance Impact** — Any performance changes
- **Remaining Work** — What could not be done or needs follow-up
- **Test Results** — What was verified

---

## 23. Architecture Enforcement

### 23.1 Core vs Feature Modules

**Core (never break):**
- Authentication and Authorization
- RBAC and Permission Engine
- User and School Management
- License System
- Database and Migrations
- Audit Logs
- Notifications (base infrastructure)
- Configuration System
- Health Checks

**Feature Modules (pluggable, optional):**
- Chapa Payment Gateway
- Telebirr Payment Gateway
- NFC Card Integration
- QR Code Integration
- Library Management
- Cafeteria Management
- AI Assistant
- SMS Gateway
- Biometric Integration
- Mobile App API

### 23.2 Rule

- Feature modules must **never break core**
- Core **cannot import** feature modules
- Feature modules use interfaces defined in core
- Disabled feature modules show "Coming Soon" in the UI
- Disabled feature modules reject API calls with `FEATURE_DISABLED`

### 23.3 Module Boundaries

```
core/                    ← required, always active
  ├── auth/
  ├── rbac/
  ├── school/
  ├── user/
  ├── license/
  ├── database/
  ├── audit/
  └── notifications/

features/                ← optional, gated by FEATURE_* flags
  ├── chapa/
  ├── telebirr/
  ├── nfc/
  ├── qr/
  ├── library/
  ├── cafeteria/
  ├── ai_assistant/
  └── sms_gateway/
```

---

## 24. Crisis Protocol

### 24.1 Production Incident

When a production system is down or degraded:

1. **Identify scope:** Single school? All schools? Feature module? Core?
2. **Contain:** Disable the affected feature via feature flag. Restore from backup if needed.
3. **Diagnose:** Read logs, check health endpoints, inspect database.
4. **Fix:** Apply minimal fix. Rollback code if needed.
5. **Verify:** Health check all systems.
6. **Report:** Document root cause, fix, and prevention.

### 24.2 Rollback Procedure

```
1. docker compose down
2. docker load < zenova-backend-<previous-version>.tar.gz
3. docker load < zenova-frontend-<previous-version>.tar.gz
4. docker compose exec -T backend alembic downgrade -1
5. docker compose up -d
6. Health check all systems
7. Report rollback to Control Center
```

### 24.3 Data Recovery

- Daily automated backups (kept for 7 days)
- Manual backup before every update
- Backup format: PostgreSQL dump (`.sql`)
- Restore: `docker compose exec -T db psql -U zenova < backup.sql`

### 24.4 Emergency Password Reset

If all password recovery options fail:

```bash
sudo zenova-reset-password
```

This Ubuntu command (installed with the School ERP) resets the super admin password after physical server access verification. Logs the reset in the audit trail.

---

## Appendices

### Appendix A: File System Layout

```
C:\Users\john\Pictures\ZENOVA\
├── PROJECT_CONSTITUTION.md       ← This document
├── AGENTS.md                     ← AI agent instructions
├── README.md                     ← Project overview
├── .gitignore                    ← Git ignore rules
│
├── backend/                      ← School ERP source (FastAPI)
├── frontend/                     ← School ERP source (Next.js)
├── control-center/               ← Control Center (private)
├── school-erp/                   ← Customer Docker package
├── license-server/               ← License validation API
│
├── deploy/                       ← VPS deployment scripts
├── release/                      ← Release packaging
├── docs/                         ← Documentation
└── graphify-out/                 ← Knowledge graph
```

### Appendix B: Key Technologies

| Layer | Technology |
|-------|-----------|
| Backend Framework | FastAPI (Python 3.12+) |
| ORM | SQLAlchemy 2.0+ |
| Validation | Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Frontend Framework | Next.js 16 (React 19) |
| Styling | Tailwind CSS |
| Language | TypeScript (strict mode) |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| License | RSA-signed license files |

### Appendix C: Environment Variables

**School ERP (see `deploy/.env.vps.example`):**
- `DOMAIN`, `DOMAIN_URL`
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_PASSWORD`
- `SECRET_KEY`
- `ZENOVA_LICENSE_KEY`, `ZENOVA_LICENSE_SERVER`, `SCHOOL_ID`
- `FEATURE_CHAPA`, `FEATURE_TELEBIRR`, etc.
- `ZENOVA_VERSION`

**Control Center (see `deploy/.env.cc.example`):**
- `CC_DOMAIN`, `CC_DOMAIN_URL`
- `CC_DB_USER`, `CC_DB_PASSWORD`, `CC_DB_NAME`
- `CC_SECRET_KEY`
- `CC_ADMIN_EMAIL`, `CC_ADMIN_PASSWORD`

### Appendix D: Feature Flag Reference

| Variable | Module | Default |
|----------|--------|---------|
| `FEATURE_CHAPA` | Chapa Payment Gateway | `false` |
| `FEATURE_TELEBIRR` | Telebirr Payment Gateway | `false` |
| `FEATURE_NFC` | NFC Card Integration | `false` |
| `FEATURE_QR` | QR Code Integration | `false` |
| `FEATURE_LIBRARY` | Library Management | `true` |
| `FEATURE_CAFETERIA` | Cafeteria Management | `true` |
| `FEATURE_AI_ASSISTANT` | AI Assistant | `false` |
| `FEATURE_SMS_GATEWAY` | SMS Gateway | `false` |

### Appendix E: Glossary

| Term | Definition |
|------|-----------|
| Control Center | Private admin panel for managing all schools |
| School ERP | Customer-facing school management system |
| Feature Flag | Environment variable that enables/disables optional modules |
| Offline Grace Period | 45-day window during which the system works without license validation |
| Hybrid Mode | Local execution with cloud backup and sync |
| Permission Engine | System that controls access based on granular permissions |
| Organization Engine | Configurable department/role/permission hierarchy |
| RBAC | Role-Based Access Control |
| RSA License | Cryptographically signed license file |
| Session Report | Markdown document generated after each engineering session |

---

*This constitution is a living document. It evolves as the project grows. All changes must be reviewed and approved before taking effect.*

**© ZENOVA — All Rights Reserved**
