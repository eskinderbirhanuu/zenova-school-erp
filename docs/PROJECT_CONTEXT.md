# ZENOVA PROJECT CONTEXT FOR AI AGENTS

## Project Overview
ZENOVA is a Hybrid School ERP (Local Server + Cloud VPS).
Technology Stack: Next.js 16 (with webpack WASM fallback), FastAPI, SQLAlchemy, PostgreSQL 16, Redis.

## Core Rules (Must Follow)
1. NO hard delete — soft delete only, everything audited.
2. Registrar ONLY for student registration (teachers cannot register).
3. Teachers are restricted from admin functions.
4. Finance: Double Entry Accounting — every transaction Debit = Credit.
5. Outside school network: All roles except SUPER_ADMIN become VIEW ONLY.
6. SUPER_ADMIN is system owner (zero school_id), separate cloud portal.

## Key Files (Read First)
- `PROGRESS.md` — Current state, credentials, run commands, remaining tasks
- `DESIGN.md` — ZENOVA design language
- `SUBPAGE_DESIGN_SPEC.md` — Sub-page pattern guide
- `docs/AGENT_LOG.md` — Architectural decisions
- `docs/DATABASE_DESIGN.md` — Schema design

## Getting Started
```bash
# Backend
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm run dev
```

## Network
- Frontend: http://localhost:3000 (external: http://192.168.1.5:3000)
- Backend: http://localhost:8000 (external: http://192.168.1.5:8000)
- API Docs: http://localhost:8000/docs

## How to interact
- Always read `PROGRESS.md` and relevant docs before any coding task.
- Prioritize strategic guidance, security, and auditability.