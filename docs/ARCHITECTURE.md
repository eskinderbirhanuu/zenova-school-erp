# Architecture

## System Topology

```
                    ┌──────────────────────┐
                    │     School Network     │
                    │     192.168.x.x       │
                    │  ┌────────────────┐   │
                    │  │  Ubuntu Server  │   │
                    │  │  (Old PC / VM)  │   │
                    │  │  Docker Compose │   │
                    │  │                │   │
                    │  │  Nginx :80     │   │
                    │  │   ├─ Frontend  │   │
                    │  │   └─ Backend   │   │
                    │  │  PostgreSQL    │   │
                    │  │  Redis         │   │
                    │  └────────────────┘   │
                    │                        │
                    │  Access: http://       │
                    │  192.168.x.x:80        │
                    │  ✅ Works offline      │
                    └──────────────────────┘

                    ┌──────────────────────┐
                    │      Cloud VPS        │
                    │  Parent Portal        │
                    │  Student Portal       │
                    │  Sync Engine          │
                    │  Payment Gateway      │
                    └──────────────────────┘
```

## Services & Ports

| Service | Internal Port | External Port | Interface |
|---------|--------------|---------------|-----------|
| Nginx | 80 | 80 | 0.0.0.0 |
| PostgreSQL | 5432 | - | localhost |
| Redis | 6379 | - | localhost |
| Backend API | 8000 | - | internal |
| Frontend | 3000 | - | internal |

## Project Structure

```
ZENOVA/
├── backend/
│   ├── app/
│   │   ├── main.py              # Entry + middleware
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── config.py            # Settings
│   │   ├── models/              # 52+ ORM models
│   │   ├── api/v1/endpoints/    # 40 endpoint files (289 routes)
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   ├── core/                # Redis, utilities
│   │   └── utils/               # Grading, helpers
│   ├── requirements.txt
│   ├── alembic.ini
│   └── scripts/seed_demo.py
├── frontend/
│   ├── src/app/
│   │   ├── (public)/            # Login, activate, about
│   │   ├── (super-admin)/       # Super Admin portal
│   │   ├── (admin)/             # Admin module
│   │   ├── (director)/          # Director module
│   │   ├── (registrar)/         # Registrar module
│   │   ├── (teacher)/           # Teacher module
│   │   ├── (finance)/           # Finance module
│   │   ├── (hr)/                # HR module
│   │   ├── (inventory)/         # Inventory module
│   │   ├── (library)/           # Library module
│   │   ├── (parent)/            # Parent portal
│   │   ├── (student)/           # Student portal
│   │   └── (cafeteria)/         # Cafeteria POS
│   ├── components/              # Reusable UI
│   ├── config/navigation.ts     # Route definitions
│   ├── services/                # API clients + Auth
│   └── middleware.ts            # Route protection
├── docs/                        # Documentation
├── scripts/                     # Deployment scripts
├── nginx/                       # Nginx config
├── docker-compose.yml
└── PROGRESS.md
```

## Key Architecture Patterns

- **Multi-tenancy**: School isolation via `school_id` / `branch_id` foreign keys
- **RBAC**: 13 roles with role-specific dashboards and route guards
- **Edge Middleware**: Next.js middleware for auth, CSRF, role routing
- **Cookie-based Auth**: `access_token` (HttpOnly), `refresh_token` (HttpOnly), `user_role` (client-side)
- **Soft Delete**: All major entities have `deleted_at` — nothing is permanently deleted
- **Audit Logging**: Every significant action logged to `AuditLog` model
- **Double-Entry Accounting**: Financial transactions balanced (Debits = Credits)

## Staff Creation Chain

```
SUPER_ADMIN → creates ADMIN
ADMIN → creates DIRECTOR
DIRECTOR → creates REGISTRAR, TEACHER, FINANCE, HR, INVENTORY, LIBRARY, CAFETERIA, AUDITOR
```

## Role Levels

| Role | Level | Scope |
|------|-------|-------|
| SUPER_ADMIN | 100 | All schools, all modules |
| ADMIN | 80 | Single school, full access |
| DIRECTOR | 60 | Staff management, academic oversight |
| REGISTRAR | 50 | Student admissions only |
| TEACHER | 45 | Attendance, grades, own students |
| FINANCE | 50 | Accounting, billing, payroll |
| HR | 50 | Staff records, leave, contracts |
| INVENTORY | 50 | Asset and stock management |
| LIBRARY | 50 | Books, borrowing, fines |
| CAFETERIA | 50 | POS, products, wallet payments |
| AUDITOR | 40 | Read-only access everywhere |
| PARENT | 20 | Cloud portal only |
| STUDENT | 10 | Cloud portal only |

## Frontend Route Groups

14 route groups: `(public)`, `(super-admin)`, `(admin)`, `(director)`, `(registrar)`, `(teacher)`, `(finance)`, `(hr)`, `(inventory)`, `(library)`, `(cafeteria)`, `(parent)`, `(student)`, `(legacy)`

## Graphify Knowledge Graph

A knowledge graph at `graphify-out/` provides god nodes, community structure, and cross-file relationships. For codebase questions, use `graphify query "<question>"` or `graphify path "<A>" "<B>"`.
