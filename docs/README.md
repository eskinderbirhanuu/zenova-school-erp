# ZENOVA — Enterprise School Management Platform

Hybrid School ERP (Local Server + Cloud VPS) for schools with 500–20,000 students. Built with FastAPI + Next.js 16 + PostgreSQL 16.

## Quick Start

```bash
# Backend
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm run dev

# Seed demo data (after backend is up)
cd backend && python seed_demo.py
```

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Super Admin Login | http://localhost:3000/super-admin/login |
| School Login | http://localhost:3000/login |

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@zenova.app | admin123 |
| Admin | admin@zenova.app | demo123 |
| Director | director@zenova.app | demo123 |
| Registrar | registrar@zenova.app | demo123 |
| Teacher | teacher@zenova.app | demo123 |
| Finance | finance@zenova.app | demo123 |
| HR | hr@zenova.app | demo123 |
| Inventory | inventory@zenova.app | demo123 |
| Library | library@zenova.app | demo123 |
| Cafeteria | cafe@zenova.app | demo123 |
| Parent | parent@zenova.app | demo123 |
| Student | student@zenova.app | demo123 |
| Auditor | auditor@zenova.app | demo123 |

## Demo Licenses

| Type | Key |
|------|-----|
| Main (yearly) | ZNV-A1B2-C3D4-E5F6-ABCD |
| Branch (yearly) | ZNV-DCBA-6F5E-4D3C-2B1A |

## Network Access (from phone)

- Wi-Fi IP: `http://192.168.1.5:3000` (not VirtualBox `192.168.56.1`)
- Backend exposed on `0.0.0.0:8000`
- Frontend exposed on `0.0.0.0:3000`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI 0.111.0 |
| ORM | SQLAlchemy 2.0.31 |
| Database | PostgreSQL 16 (psycopg2) |
| Migrations | Alembic 1.13.2 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Cache | Redis 7 |
| Frontend | Next.js 16.2.9 (webpack WASM fallback) |
| Styling | Tailwind CSS v4 |
| UI | Radix UI + Shadcn |
| Charts | Recharts 2.15.0 |
| Animations | Framer Motion 12.40.0 |
| Icons | Lucide React 1.21.0 |

## Documentation Index

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, project structure, patterns |
| [DATABASE.md](DATABASE.md) | Schema, models, relationships, migrations |
| [API.md](API.md) | Endpoint reference, integration guide |
| [SECURITY.md](SECURITY.md) | Auth, RBAC, network security, hardening |
| [FINANCE.md](FINANCE.md) | Double-entry accounting, GL, billing, payroll |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker, Ubuntu server, PWA, scripts |
| [LICENSE.md](LICENSE.md) | License system, key generation, anti-piracy |
| [REGISTRATION.md](REGISTRATION.md) | Registration rules, parent linking, QR/NFC |
| [ROADMAP.md](ROADMAP.md) | Phases, milestones, completed/remaining |
| [REVIEWS.md](REVIEWS.md) | Code review findings, contradictions, fixes |
| [DESIGN.md](DESIGN.md) | Design system, components, subpage patterns |
| [MODULES.md](MODULES.md) | Per-module documentation |
| [CHANGELOG.md](CHANGELOG.md) | Agent decisions, changes, migrations |
| [COMPLETED_WORK.md](COMPLETED_WORK.md) | Full output of AI implementation session |

## AI Audit Series (GLM-5.2, 2026-06-30)

Analysis-only documentation produced for DeepSeek V4 Flash to implement. No code was modified.

| Doc | Description |
|-----|-------------|
| [AI_ANALYSIS.md](AI_ANALYSIS.md) | Master analysis: 18 prioritized issues with severity, complexity, impact |
| [SECURITY_AUDIT.md](SECURITY_AUDIT.md) | Vulnerabilities, attack scenarios, fixes (Critical → Low) |
| [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) | Tenancy, sync, offline-first, scalability, RLS recommendation |
| [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) | 12 bottlenecks: N+1, COUNT-based numbers, single worker, indexes |
| [CODE_IMPROVEMENTS.md](CODE_IMPROVEMENTS.md) | 15 refactoring opportunities with risks |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | 20-item debt register |
| [DEEPSEEK_TASKS.md](DEEPSEEK_TASKS.md) | 26 step-by-step tasks (P0→P3) for implementation |
| [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) | Go/no-go: score 5.5/10, blockers, deploy checklist |

## Core Rules

1. No hard delete — soft delete only (`deleted_at` timestamp)
2. Everything audited — every mutation creates audit log
3. Everything traceable — who, when, IP, device, old/new values
4. Everything recoverable — audit trail allows full reconstruction
5. Finance uses Double Entry Accounting — every journal entry: Debit = Credit
6. Parent Portal and Student Portal are cloud only
7. Local staff become View Only outside school network
8. SUPER_ADMIN has unrestricted access everywhere

## Known Issues

- SWC binary (`@next/swc-win32-x64-msvc`) incompatible; falls back to WASM
- Docker Desktop unavailable; using direct PostgreSQL 16 + uvicorn
- Next.js compilation slow on first request (WASM fallback)
- Windows Firewall blocks external access on Public networks
