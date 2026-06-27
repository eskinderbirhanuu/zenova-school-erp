# ZENOVA DEVELOPMENT ROADMAP — MASTER PLAN

## Phase Overview

| Phase | Module | Effort | Dependencies | Status |
|-------|--------|--------|-------------|--------|
| 1 | Foundation | ~2 hrs | None | ✅ Done |
| 2 | Authentication | ~2 hrs | Phase 1 | 🔜 Next |
| 3 | License Engine | ~1 hr | Phase 2 | ⏳ |
| 4 | Registration | ~3 hrs | Phase 3 | ⏳ |
| 5 | Academic | ~2 hrs | Phase 4 | ⏳ |
| 6 | Finance | ~5 hrs | Phase 4, 5 | ⏳ (Most Important) |
| 7 | Inventory | ~1.5 hrs | Phase 4 | ⏳ |
| 8 | Library | ~1.5 hrs | Phase 4 | ⏳ |
| 9 | Cafeteria | ~2 hrs | Phase 4, 6 | ⏳ |
| 10 | Parent Portal | ~3 hrs | Phase 4, 5, 6 | ⏳ (Cloud VPS) |
| 11 | Student Portal | ~2 hrs | Phase 4, 5 | ⏳ (Cloud VPS) |
| 12 | Analytics | ~2 hrs | Phase 5, 6 | ⏳ |
| 13 | Mobile Apps | ~4 hrs | Phase 9 | ⏳ |
| 14 | Production | ~3 hrs | All phases | ⏳ |

---

## Phase 1 — Foundation ✅ DONE
**Deliverables:**
- Docker Compose setup (PostgreSQL, Redis, FastAPI)
- FastAPI application with health endpoint
- SQLAlchemy configuration
- Alembic migrations setup
- Core models: User, Role, School, Branch, License, AuditLog
- Core utilities: Security (JWT, bcrypt), Audit logging
- Dockerfile for backend
- Environment configuration

---

## Phase 2 — Authentication 🔜 NEXT
**Deliverables:**
- Auth endpoints: login, register, refresh, logout
- JWT access + refresh token implementation
- Password reset flow (forgot/reset)
- Role-based permission middleware
- Current user profile endpoint
- Login audit logging
- Auth tests

---

## Phase 3 — License Engine
**Deliverables:**
- License verification endpoint
- License activation endpoint
- Setup wizard API (school → branch → admin)
- License CRUD (SUPER_ADMIN)
- License status management
- Locked/unlocked system state
- License model seed data

---

## Phase 4 — Registration System
**Deliverables:**
- Student model, schema, service, endpoints
- Parent model, schema, service, endpoints
- Parent-Student linking with smart search
- Teacher profile model (extension of User)
- Staff profile model (extension of User)
- QR code generation service
- NFC card assignment service
- Auto-ID generation service
- Registration composite endpoint
- Registration audit logging

---

## Phase 5 — Academic System
**Deliverables:**
- Academic Year, Semester management
- Class (Grade), Section management
- Subject management
- Classroom management
- Timetable management
- Teacher assignment to grades/sections
- Exam management
- Exam results entry
- Report card generation
- Student promotion

---

## Phase 6 — Finance System ⭐ MOST IMPORTANT
**Deliverables:**
- Chart of Accounts (full tree structure)
- Account Types (Asset, Liability, Equity, Revenue, Expense)
- Double-entry journal engine
- General ledger with running balance
- Accounting periods with lock/unlock
- Fee structures and fee assignments
- Invoice generation (with PDF)
- Payment recording (multiple methods)
- Student wallet (top-up, spend, history)
- Receipt generation
- Expense management
- Payroll processing (run, approve, payslip)
- Budget management
- Procurement (request → PO → receipt → match)
- Scholarship management
- Financial reports:
  - Trial Balance
  - Balance Sheet
  - Income Statement
  - Cash Flow Statement
  - Revenue Report
  - Expense Report
  - Student Payment Report
  - Aging Report
  - Budget Variance Report

### Finance Modules Breakdown

#### 6a. Chart of Accounts
- Account CRUD with parent-child tree
- Account type validation
- Balance tracking

#### 6b. Journal Engine
- Entry creation with debit=credit validation
- Entry reversal (no deletion)
- Period validation
- Audit logging

#### 6c. Ledger
- Real-time balance updates
- Account history query
- Date range filtering

#### 6d. Student Billing
- Fee structure management
- Fee assignment to students
- Invoice auto-generation
- Payment recording
- Receipt generation

#### 6e. Wallet
- Wallet creation per student
- Top-up (cash, bank, mobile)
- Spending (cafeteria, services)
- Transaction history

#### 6f. Payroll
- Employee salary configuration
- Monthly payroll run
- Approval workflow
- Payslip generation

#### 6g. Budget & Procurement
- Annual/department budgets
- Purchase request workflow
- PO management
- Goods receipt

---

## Phase 7 — Inventory System
**Deliverables:**
- Categories management
- Items/Assets management
- Stock tracking
- Suppliers management
- Purchase orders
- Stock movements and transfers
- Barcode/QR support

---

## Phase 8 — Library System
**Deliverables:**
- Book registration (ISBN, title, author)
- Book borrowing/return
- Fine calculation
- QR-based borrowing
- Student library history

---

## Phase 9 — Cafeteria POS
**Deliverables:**
- Product management
- POS interface (mobile-first)
- QR code payments
- NFC payments
- Wallet integration
- Daily sales reports
- Offline-first mode (local storage + sync)

---

## Phase 10 — Parent Portal (Cloud VPS)
**Deliverables:**
- Separate Next.js application
- Parent authentication
- View children's attendance
- View exam results
- View fee status
- Wallet top-up (online payment)
- Messaging with teachers
- Notifications

---

## Phase 11 — Student Portal (Cloud VPS)
**Deliverables:**
- Separate Next.js application
- Student authentication
- View own attendance
- View grades and results
- View timetable
- View assignments
- Wallet balance
- Announcements

---

## Phase 12 — Analytics & BI
**Deliverables:**
- Academic performance analytics
- Attendance trends
- Financial analytics
- Risk detection (student dropout, fee default)
- Custom report builder
- Dashboard widgets

---

## Phase 13 — Mobile Apps
**Deliverables:**
- Mobile POS (React Native)
- Parent mobile app
- Student mobile app
- Offline support
- Push notifications

---

## Phase 14 — Production Release
**Deliverables:**
- Performance optimization
- Security hardening
- SSL/TLS configuration
- Backup automation
- Monitoring (Prometheus + Grafana)
- Load testing
- Documentation
- Deployment scripts
- CI/CD pipeline (GitHub Actions)
