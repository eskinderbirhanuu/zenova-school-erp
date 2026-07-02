# Roadmap

## Development Phases

| Phase | Module | Description | Status |
|-------|--------|-------------|--------|
| 1 | Foundation | Docker, FastAPI, DB, Redis | ✅ Done |
| 2 | Authentication | Login, register, JWT, RBAC | ✅ Done |
| 3 | License Engine | Key verification, activation | ✅ Done |
| 4 | Registration | Students, parents, QR, NFC | ✅ Done |
| 5 | Academic | Classes, sections, subjects, timetable, exams | ✅ Done |
| 6 | Finance | Double-entry, billing, payroll, reports | ✅ Done |
| 7 | Inventory | Stock, assets, suppliers | ✅ Done |
| 8 | Library | Books, borrowing, fines | ✅ Done |
| 9 | Cafeteria | POS, wallet, QR/NFC payments | ✅ Done |
| 10 | Parent Portal | Cloud VPS deployment | ⏳ Pending |
| 11 | Student Portal | Cloud VPS deployment | ⏳ Pending |
| 12 | Analytics | BI, reports, risk detection | ⏳ In Progress |
| 13 | Mobile Apps | React Native POS and portals | ⏳ Pending |
| 14 | Production | Hardening, scaling, launch | ⏳ Pending |

## Completed ✅

### Backend
- Foundation: Core models, SQLAlchemy config, Alembic, JWT/bcrypt, audit logging
- Auth: login, refresh, logout, password reset, role-based middleware
- License: verification, activation, CRUD, setup wizard
- Registration: Student/Parent models, QR/NFC, auto-ID
- Academic: AcademicYear, Semester, Class, Section, Subject, Timetable, Exam, Results
- Finance: Chart of Accounts, Double-entry journal, GL, Fees, Invoices, Payments, Wallet, Expenses, Payroll, Budget, Procurement, 9 reports
- HR: Employee profiles, contracts, attendance, leave, performance, recruitment
- Inventory: Categories, Items, Stock, Suppliers, Purchase Orders, Transfers
- Library: Books (ISBN), Borrowing/Return, Fines, QR-based, Member history
- Cafeteria: Products, POS, QR/NFC payments, Wallet integration
- Communication: Messages, announcements
- Users management: GET/PATCH /users, GET /roles
- Bulk attendance: POST /attendance/bulk
- Seed script: 13 role users, academic structure, students, parents, accounts
- 289 routes across 40 endpoint files

### Frontend
- 14 route groups with Edge middleware
- RoleGuard + RoleLayout for role-based access
- AuthContext with cookie-based auth
- Axios auto-refresh interceptor
- Error boundary on every page
- All 13 Role Dashboards (with 3D + micro-animations)
- 16 Super Admin pages, 12 Admin pages, complete Director/Registrar modules
- Design System: ZENOVA Design Language, glassmorphism, bento grid
- 3D Animations: framer-motion, three.js, R3F

### Recent (June 29-30)
- Phase 8.1 — Student Transcript (cumulative endpoint + frontend page)
- Phase 8.2 — Grade distribution + staff distribution analytics endpoints
- Phase 8.3 — Attendance export endpoint; Export Center page at admin/exports
- Full code review completed (backend + frontend)
- Grade computation extracted to `app/utils/grading.py`
- Student document endpoints filter by `school_id`
- Teacher results page API call fixed
- Admin student detail page with transcript link
- Pagination added to library/fines, library/members, announcements, assignments
- Cafeteria PUT → PATCH consistency
- Magic numbers moved to settings.py
- Analytics N+1 → single aggregate query
- Documentation consolidation (this doc set)

## High Priority Remaining ⏳

- [ ] Connect remaining frontend pages using mock data to real backend API
- [ ] Build remaining detail views (teacher detail, employee detail, etc.)
- [ ] Parent Portal cloud deployment (separate VPS)
- [ ] Student Portal cloud deployment (separate VPS)
- [ ] Replace 30s polling with WebSocket notifications
- [ ] Fix critical token blacklist bug (blacklisting on creation)
- [ ] Implement MFA for financial/super-admin accounts
- [ ] Add `deleted_at` to 54+ models still missing soft delete
- [ ] Unify two permission systems (`require_role` vs `PermissionChecker`)
- [ ] Replace `Base.metadata.create_all` with proper Alembic migrations

## Medium Priority

- [ ] Finish upgrading remaining sub-pages to ZENOVA Design System
- [ ] Mobile responsive polish on all pages
- [ ] Loading/error/empty states for all data-fetching pages
- [ ] Search + filter + pagination on all list pages
- [ ] Complete Auditor, Parent Portal, Student Portal pages
- [ ] Remove wildcard CORS (fix double middleware)

## Low Priority

- [ ] Analytics & BI dashboards (Phase 12)
- [ ] Mobile apps (React Native — Phase 13)
- [ ] Performance optimization
- [ ] SSL/TLS configuration
- [ ] Backup automation
- [ ] Monitoring (Prometheus + Grafana)
- [ ] CI/CD pipeline
- [ ] Production deployment
