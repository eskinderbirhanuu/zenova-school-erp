# ZENOVA MASTER SPECIFICATION v3.0

ZENOVA is a production-grade Hybrid School ERP designed for schools with 500–20,000 students.

## Architecture

### Local School Server
- Ubuntu Server
- Docker Compose
- PostgreSQL
- Redis
- FastAPI Backend
- Next.js 15 Frontend
- Nginx Reverse Proxy
- Celery Background Tasks

### Cloud VPS
- Parent Portal (Next.js 15)
- Student Portal (Next.js 15)
- Push Notifications (Firebase)
- Online Payments
- Remote Access APIs
- Sync Engine (Local ↔ Cloud)

## Core System Rules

1. No hard delete — soft delete only (deleted_at timestamp)
2. Everything audited — every mutation creates audit log
3. Everything traceable — who, when, IP, device, old value, new value
4. Everything recoverable — audit trail allows full reconstruction
5. Finance uses Double Entry Accounting — every journal entry: Debit = Credit
6. Parent Portal and Student Portal are cloud only
7. Local staff become View Only outside school network
8. SUPER_ADMIN has unrestricted access everywhere

## User Roles (13)

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

## Staff Creation Chain

```
SUPER_ADMIN → creates ADMIN
ADMIN → creates DIRECTOR
DIRECTOR → creates REGISTRAR, TEACHER, FINANCE, HR, INVENTORY, LIBRARY, CAFETERIA, AUDITOR
```

## Modules

### Local Server Modules
- Admin Dashboard
- Director Dashboard
- Registrar Dashboard
- Teacher Dashboard
- Finance Module
- HR Module
- Inventory Module
- Library Module
- Cafeteria POS
- Audit System
- License Engine
- QR & NFC Identity System

### Cloud VPS Modules
- Parent Portal
- Student Portal
- Notification Engine
- Payment Gateway

## Technology Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- React Query (data fetching)
- Zustand (state management)
- PWA support

### Backend
- FastAPI (Python 3.12)
- SQLAlchemy 2.0 (ORM)
- PostgreSQL 16 (database)
- Redis 7 (cache + session)
- Celery (background tasks)
- Alembic (migrations)
- JWT Authentication
- RBAC Authorization
- Audit Middleware

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)
- Prometheus + Grafana (monitoring)

## License System

System locked until activation. Activation flow:
1. Enter Main License Key
2. Enter Branch License Key
3. Create School
4. Create Branch
5. Create Admin
6. Setup Wizard complete → system unlocked

License Types: Trial, Monthly, Yearly, Lifetime
License Statuses: Active, Expired, Suspended, Revoked

## Network Security

Inside school network → normal full access.
Outside school network → VIEW ONLY for: ADMIN, DIRECTOR, REGISTRAR, TEACHER, FINANCE, HR, INVENTORY, LIBRARY, CAFETERIA, AUDITOR.
SUPER_ADMIN exempt.

## Finance System

THE MOST IMPORTANT MODULE.

- Double Entry Accounting
- Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses)
- Journal Entries with Debit = Credit validation
- General Ledger with real-time balance updates
- Accounting Periods with lock/unlock
- Student Billing (Admission, Tuition, Transport, Library, Cafeteria, Exams, Custom)
- Invoice generation with PDF export
- Multiple Payment Methods (Cash, Bank, Mobile Money, Telebirr, CBE Birr, Wallet)
- Student Wallet with top-up and spending
- Scholarship System (Full, Partial, Discount)
- Payroll (Salaries, Allowances, Bonuses, Deductions, Overtime, Payslips)
- Budget (Annual, Departmental, Variance Tracking)
- Procurement (Purchase Request → PO → Goods Receipt → Invoice Match)
- Financial Reports (Trial Balance, Balance Sheet, Income Statement, Cash Flow)
- Anti-fraud: No silent edits, reversal-only, approval workflows, period locking

## Development Phases

| Phase | Module | Description |
|-------|--------|-------------|
| 1 | Foundation | Docker, FastAPI, DB, Redis setup |
| 2 | Authentication | Login, register, JWT, RBAC |
| 3 | License Engine | Key verification, activation |
| 4 | Registration | Students, parents, QR, NFC |
| 5 | Academic | Classes, sections, subjects, timetable, exams |
| 6 | Finance | Double-entry, billing, payroll, reports |
| 7 | Inventory | Stock, assets, suppliers |
| 8 | Library | Books, borrowing, fines |
| 9 | Cafeteria | POS, wallet, QR/NFC payments |
| 10 | Parent Portal | Cloud VPS deployment |
| 11 | Student Portal | Cloud VPS deployment |
| 12 | Analytics | BI, reports, risk detection |
| 13 | Mobile Apps | React Native POS and portals |
| 14 | Production | Hardening, scaling, launch |

## Goals

- Enterprise-grade School ERP
- Offline-first local operation
- Cloud-based parent/student portals
- 500–20,000 student capacity per school
- Multi-school, multi-branch support
- Full audit and compliance
- Role-based security with network-aware restrictions
