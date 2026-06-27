# ZENOVA PROGRESS

## Run Commands
```bash
# Backend (run this first)
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm run dev

# Demo seed (after backend is up)
cd backend && python seed_demo.py

# Graphify update (after code changes)
graphify update .
```

## URLs
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Super Admin Login | http://localhost:3000/super-admin/login |
| School Login | http://localhost:3000/login |

## Login Credentials
| Role | Email | Password |
|---|---|---|
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
|---|---|
| Main (yearly) | ZNV-A1B2-C3D4-E5F6-ABCD |
| Branch (yearly) | ZNV-DCBA-6F5E-4D3C-2B1A |

## Network Access (from phone)
- Use Wi-Fi IP: `http://192.168.1.5:3000` (NOT VirtualBox `192.168.56.1`)
- Backend exposed on `0.0.0.0:8000`
- Frontend exposed on `0.0.0.0:3000` (via `-H 0.0.0.0` flag)

---

## What's Completed ✅

### Backend (FastAPI + SQLAlchemy + PostgreSQL)
- Foundation: Core models (User, Role, School, Branch, License, AuditLog), SQLAlchemy config, Alembic, JWT/bcrypt security, audit logging
- Auth: login, refresh, logout, password reset endpoints, role-based middleware
- License: verification, activation, CRUD, setup wizard, locked/unlocked system state
- Registration: Student, Parent models + endpoints, Parent-Student linking, QR/NFC, auto-ID
- Academic: AcademicYear, Semester, Class, Section, Subject, Timetable, Exam, Results models + CRUD
- Finance: Chart of Accounts (tree), Double-entry journal engine, General Ledger, Fee structures, Invoices, Payments, Student Wallet, Expenses, Payroll, Budget, Procurement, 9 financial reports
- HR: Employee profiles, contracts, attendance, leave, performance, recruitment
- Inventory: Categories, Items, Stock, Suppliers, Purchase Orders, Transfers, Barcode/QR
- Library: Books (ISBN), Borrowing/Return, Fines, QR-based, Member history
- Cafeteria: Products, POS, QR/NFC payments, Wallet integration, Daily sales, Offline-first
- Communication: Messages model + schemas + service, POST/GET messages, read receipts
- Users management: GET/PATCH /users, GET /roles
- Bulk attendance: POST /attendance/bulk
- Seed script: 13 role users, academic structure, students, parents, accounts, library, inventory, cafeteria

### Frontend (Next.js 16 + TypeScript + Tailwind v4 + Shadcn + Recharts)

**Architecture:**
- 14 route groups with Edge middleware
- RoleGuard + RoleLayout for role-based access
- AuthContext with cookie-based auth (access_token, user_role)
- normalizeUser() for role field mapping
- Axios auto-refresh interceptor
- Error boundary on every page

**All 13 Role Dashboards (with 3D + micro-animations):**
- Super Admin — Mission Control (8 KPIs + 3 charts + activity + 3D orb)
- Admin — Control Center (6 KPIs + 2 charts + bento grid)
- Director — Executive Analytics (6 KPIs + 3 charts)
- Teacher — Classroom Dashboard (4 KPIs + chart + tasks + activity)
- Parent — Parent Portal (child cards + activity + quick actions)
- Student — Student Portal (attendance + grades + timetable + wallet)
- Registrar — Registrar Workflow (4 KPIs + chart + recent + quick)
- Finance — Finance Hub (6 KPIs + 3 charts + activity + actions)
- HR — People Hub (6 KPIs + 3 charts + activity + actions)
- Library — Library Hub (4 KPIs + chart + activity + quick)
- Cafeteria — Cafeteria Hub (4 KPIs + chart + orders + quick)
- Inventory — Inventory Hub (4 KPIs + chart + stock + quick)
- Auditor — Compliance Hub (6 KPIs + chart + activity + actions)

**Super Admin Enterprise (16 pages):**
- Login (2FA, session tracking), Dashboard, Schools (list + create + license auto-gen), Licenses (list + search/filter + generate + renew/suspend/revoke), Monitoring (CPU/Memory/Disk + DB health + API health + live uptime), Revenue (composed chart + transactions + per-school breakdown), Support (tickets with priority/status), Settings (tabbed: General/Security/Notifications/Data), Admins, Users, Audit, Reports, Branches

**Admin Module (12 pages):**
- Dashboard (6 KPIs + 2 charts + bento grid), Branches (list + new), Directors (list + new), Academic-Years (list + create + set current), Analytics (4 charts + 4 KPIs), School Profile (3 sections), Settings (4 sections), Reports (8 reports + category filter), Audit (color-coded + IP)

**Director Module:**
- Dashboard (upgraded), Teachers (list + new), Staff (new), Registrars (list + new)

**Registrar Module:**
- Dashboard, Students (list + new), Parents (list)

**Other Role Modules:** All have complete sub-pages for their respective domains

**Design System:**
- ZENOVA Design Language (Linear-inspired, premium SaaS)
- globals.css: Color tokens, glassmorphism, reduced motion, animation keyframes, scrollbar
- Components: Card (shadow variants), KPICard (trend + accent), PageHeader, StatusBadge (6 variants), TrendIndicator, StatCard, SectionHeader, EmptyState, DataTable<T>, Glassmorphism (sidebar + header)
- All dashboards follow bento grid layout (7-col: 4+3)

**3D Animations (NEW — June 23):**
- framer-motion installed: FadeInUp, StaggerContainer/StaggerItem, ScaleIn
- three + @react-three/fiber + @react-three/drei installed
- AnimatedBackground: Floating 3D geometric wireframe shapes (torus, octahedron, icosahedron, dodecahedron)
- InteractiveModel: ZENOVA orb (wireframe icosahedron + rotating rings, OrbitControls)
- All 13 dashboards have 3D background + staggered micro-animations

---

## What's Remaining ⏳

### High Priority
- [ ] Connect frontend pages to real backend API (many pages use mock data)
- [ ] Build remaining detail views (school detail, student detail, teacher detail, etc.)
- [ ] Parent Portal cloud deployment (separate VPS)
- [ ] Student Portal cloud deployment (separate VPS)
- [ ] Replace 30s polling with WebSocket notifications

### Medium Priority
- [ ] Finish upgrading remaining 118 sub-pages to ZENOVA Design System (SUBPAGE_DESIGN_SPEC.md)
- [ ] Mobile responsive polish on all pages
- [ ] Loading/error/empty states for all data-fetching pages
- [ ] Search + filter + pagination on all list pages
- [ ] Complete Auditor module (audit-specific tools)
- [ ] Complete Parent Portal pages (attendance, results, fees, messaging)
- [ ] Complete Student Portal pages (grades, timetable, assignments, wallet)

### Low Priority
- [ ] Analytics & BI dashboards (Phase 12)
- [ ] Mobile apps (React Native — Phase 13)
- [ ] Performance optimization
- [ ] SSL/TLS configuration
- [ ] Backup automation
- [ ] Monitoring (Prometheus + Grafana)
- [ ] CI/CD pipeline
- [ ] Production deployment

---

## Known Issues 🐛
- SWC binary (`@next/swc-win32-x64-msvc`) incompatible; falls back to WASM (webpack works)
- Docker Desktop cannot start; using direct PostgreSQL 16 + uvicorn
- Backend running on port 8000, frontend on port 3000
- Next.js compilation is slow on first request (WASM fallback)
- Windows Firewall blocks external access on Public networks; use Private network or add rules

## Key Design Decisions
- SUPER_ADMIN = system owner, zero school_id, separate cloud portal, never logs into school servers
- Soft delete only; everything audited, traceable, recoverable
- Finance: Double Entry Accounting (every transaction Debit = Credit)
- Outside school network: all roles except SUPER_ADMIN become VIEW ONLY
- Glassmorphism on navigation surfaces (top header + sidebar)
- Bento grid layout (7-col: 4+3) for all dashboards
- Cookie-based auth: access_token + user_role cookies
- 13 roles, single login, middleware redirects to role dashboard
