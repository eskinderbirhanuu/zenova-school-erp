# ZENOVA — Principal Technical Review Report

> **Project:** ZENOVA Enterprise School Management Platform
> **Review Date:** June 27, 2026
> **Reviewer:** Principal Technical Reviewer
> **Scope:** Full-stack review — Backend (FastAPI), Frontend (Next.js 16), Infrastructure, Security, Architecture

---

## Table of Contents
1. [System Understanding Report](#1-system-understanding-report)
2. [Missing Requirements Report](#2-missing-requirements-report)
3. [Contradictions Report](#3-contradictions-report)
4. [Missing Security Features](#4-missing-security-features)
5. [Missing Business Rules](#5-missing-business-rules)
6. [Missing Documentation](#6-missing-documentation)
7. [Missing APIs](#7-missing-apis)
8. [Missing Database Relationships](#8-missing-database-relationships)
9. [Missing UI Screens](#9-missing-ui-screens)
10. [Missing User Roles](#10-missing-user-roles)
11. [Architecture Summary](#11-architecture-summary)
12. [Dependency Map](#12-dependency-map)
13. [Data Flow Diagram](#13-data-flow-diagram)
14. [Risk Report](#14-risk-report)
15. [Recommended Improvements](#15-recommended-improvements)

---

## 1. System Understanding Report

### 1.1 Project Overview
ZENOVA is a **multi-tenant, role-based Enterprise Resource Planning (ERP) system** for educational institutions. It targets schools, school districts, and educational chains. The platform supports:

- **13 distinct user roles** with granular permissions
- **Multi-branch school management** (Main + Branch licenses)
- **Academic management** (students, classes, exams, timetables)
- **Financial operations** (double-entry accounting, invoicing, payments, budgets)
- **Human resources** (contracts, attendance, leave, performance, recruitment)
- **Inventory & Assets** (stock tracking, procurement, transfers)
- **Library management** (books, borrow/return, fines, ISBN tracking)
- **Cafeteria POS** (products, orders, wallet payments, offline-first)
- **Communication tools** (announcements, messages, notifications, Telegram)
- **Audit & compliance** (comprehensive audit logging, reporting)

### 1.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Python FastAPI | 0.111.0 |
| ORM | SQLAlchemy | 2.0.31 |
| Database | PostgreSQL 16 | (via psycopg2) |
| Migrations | Alembic | 1.13.2 |
| Auth | JWT (python-jose) | 3.3.0 |
| Password Hashing | bcrypt (passlib) | 1.7.4 |
| Rate Limiting/Cache | Redis | 5.0.6 |
| Frontend | Next.js | 16.2.9 |
| Frontend Framework | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| UI Components | Radix UI + Custom | — |
| Charts | Recharts | 2.15.0 |
| 3D Graphics | Three.js + R3F | 0.184.0 |
| Animations | Framer Motion | 12.40.0 |
| Icons | Lucide React | 1.21.0 |
| State/HTTP | React Context + Axios | — |

### 1.3 Project Structure
```
ZENOVA/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── main.py            # Application entry + middleware
│   │   ├── database.py        # SQLAlchemy + engine config
│   │   ├── models/             # 52+ ORM models (modular)
│   │   ├── api/v1/endpoints/   # REST API routers (26 modules)
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic layer
│   │   ├── core/               # Redis, utilities
│   │   └── config.py           # Settings
│   ├── requirements.txt
│   ├── alembic.ini
│   └── seed_demo.py
├── frontend/                   # Next.js 16 application
│   ├── src/app/               # App Router (Next.js 16)
│   │   ├── (public)/          # Public pages (login, activate, about)
│   │   ├── (super-admin)/     # Super Admin portal
│   │   ├── (admin)/           # Admin module
│   │   ├── (director)/        # Director module
│   │   ├── (registrar)/       # Registrar module
│   │   ├── (teacher)/         # Teacher module
│   │   ├── (finance)/         # Finance module
│   │   ├── (hr)/              # HR module
│   │   ├── (inventory)/       # Inventory module
│   │   ├── (library)/         # Library module
│   │   ├── (parent)/          # Parent portal
│   │   ├── (student)/         # Student portal
│   │   └── (legacy)/          # Legacy/unrefactored pages
│   ├── components/            # Reusable components (UI, layout, 3D, auth)
│   ├── config/navigation.ts   # Role-based navigation
│   ├── services/              # API clients + Auth context + Setup context
│   ├── middleware.ts           # Route protection + role routing
│   └── globals.css           # Design system tokens
├── scripts/                    # Deployment scripts
├── nginx/                      # Nginx config
└── PROGRESS.md                 # Development status
```

### 1.4 Key Architectural Patterns
- **Multi-tenancy**: Each school (with branches) is isolated via `school_id` and `branch_id` FKs across most models.
- **RBAC (Role-Based Access Control)**: 13 roles with role-specific dashboards and route guards.
- **Edge Middleware**: Next.js middleware for authentication, CSRF, and role-based routing.
- **Cookie-based Authentication**: `access_token` (HttpOnly), `refresh_token` (HttpOnly), `user_role` (client-side), and `csrf_token` (for state-changing operations).
- **Soft Delete**: All major entities have a `deleted_at` column; nothing is truly deleted.
- **Audit Logging**: Every significant action is logged to `AuditLog` model.
- **Double-Entry Accounting**: Financial transactions are balanced (Debits = Credits).

---

## 2. Missing Requirements Report

### 2.1 Authentication & Authorization
| # | Missing Requirement | Impact | Priority |
|---|--------------------|--------|----------|
| 1 | **Multi-Factor Authentication (MFA/2FA)** | Critical for financial/super-admin access; currently single-password only | CRITICAL |
| 2 | **OAuth / SSO Integration** (Google, Microsoft, SAML) | Schools expect SSO; only manual registration exists | HIGH |
| 3 | **Session management dashboard** (view active sessions, revoke) | Users can't see or kill active sessions | MEDIUM |
| 4 | **Password strength enforcement / policy configuration** | No visible complexity rules beyond basic length | HIGH |
| 5 | **Account lockout self-service unlock (admin-initiated)** | Locked accounts require manual DB intervention | MEDIUM |
| 6 | **Device fingerprinting / trusted devices** | No device-level trust model; anyone with cookies gains access | MEDIUM |

### 2.2 Core Business Logic
| # | Missing Requirement | Impact | Priority |
|---|--------------------|--------|----------|
| 1 | **Email service integration** (SMTP/SES/SendGrid) | Password resets, notifications, invoices — all notifications are inert | CRITICAL |
| 2 | **SMS gateway integration** (Twilio, AWS SNS) | OTP delivery, parent notifications — toggles exist but no backend logic | HIGH |
| 3 | **Payment gateway integration** (Stripe, PayPal, Flutterwave) | Fee payments, wallet top-ups, cafeteria purchases — no real payment processing | CRITICAL |
| 4 | **Payroll processing engine** | PayrollRun/PayrollItem models exist but no automated calculation | HIGH |
| 5 | **Automated invoice generation & reminders** | Invoices must be manually created; no recurring/due-date automation | HIGH |
| 6 | **Library fine auto-calculation** | `fine_amount` is static; no cron job for daily overdue fine accrual | HIGH |
| 7 | **Cafeteria POS stock auto-decrement** | No automatic inventory reduction on order creation | MEDIUM |
| 8 | **Bulk import templates & validation feedback** | Excel imports lack row-level error reporting | MEDIUM |
| 9 | **Data migration tools** (from other school management systems) | No import from competitors (e.g., PowerSchool, Alma) | LOW |

### 2.3 Frontend Experience
| # | Missing Requirement | Impact | Priority |
|---|--------------------|--------|----------|
| 1 | **Real-time notifications** (WebSocket/Socket.IO) | 30-second polling used; waste of resources | HIGH |
| 2 | **Offline/PWA capabilities** (service worker caching) | PWA components exist but not fully functional | MEDIUM |
| 3 | **Mobile responsive polish** | Tables overflow on mobile; some layouts break | HIGH |
| 4 | **Loading, error, and empty states** on ALL data pages | Inconsistent UX across subpages | MEDIUM |
| 5 | **Search, filter, AND pagination** on all list pages | Many pages fetch all records unbounded | HIGH |
| 6 | **Print-friendly report views** | No print-specific CSS or PDF generation | MEDIUM |
| 7 | **Dark/light theme toggle** | Only dark theme fully implemented on welcome page | LOW |
| 8 | **Accessibility (WCAG 2.1 AA) audit** | Missing `aria-labels`, focus management, screen reader support | HIGH |

### 2.4 DevOps & Infrastructure
| # | Missing Requirement | Impact | Priority |
|---|--------------------|--------|----------|
| 1 | **Docker / containerization** | `Dockerfile`/`docker-compose.yml` absent | HIGH |
| 2 | **CI/CD pipeline** (GitHub Actions, etc.) | Manual deployment only | HIGH |
| 3 | **Automated testing** (unit, integration, e2e) | Only `pytest` installed; no test files found | CRITICAL |
| 4 | **Production environment configuration** | `.env.example` missing; hardcoded dev values | HIGH |
| 5 | **SSL/TLS termination** | Only `nginx.conf` present; not configured for HTTPS | HIGH |
| 6 | **Monitoring & alerting** (Prometheus, Grafana, Sentry) | Only basic health check endpoint exists | MEDIUM |
| 7 | **Log aggregation** (ELK, Datadog) | Logs go to stdout / file only | MEDIUM |
| 8 | **Backup automation** | No automated DB backup scripts visible | CRITICAL |

---

## 3. Contradictions Report

### 3.1 Design & Architecture Contradictions

| # | Contradiction | Location | Impact |
|---|-------------|----------|--------|
| 1 | **"Never logs into school servers" vs `/super-admin/login` exists** | Design docs say SUPER_ADMIN never logs into school servers, yet the frontend has a `/super-admin/login` page | Architectural confusion — does SA have a local login or not? |
| 2 | **Tailwind v4 config vs legacy patterns** | `globals.css` defines CSS variables, but some components still inline raw hex colors | Inconsistent theming |
| 3 | **Three route group naming conventions** | `(super-admin)`, `(legacy)`, `(public)` — mixed kebab/camel for no clear reason | Naming inconsistency |
| 4 | **`sidebar.tsx` hardcodes nav items in two places** | `components/layout/sidebar.tsx` AND `config/navigation.ts` both define navigation; Divergent data sources | Risk of nav drift between layouts |
| 5 | **`RoleLayout` vs raw sidebar usage** | Some pages use `RoleLayout` (from `role-layout.tsx`), others use the old `Sidebar` component | UI fragmentation |
| 6 | **Frontend declares 13 roles but backend `Role` model has no hierarchy** | Frontend assumes a fixed set of roles; backend `Role` is a generic many-to-many with no enforcement | Backend allows arbitrary role names, frontend breaks |
| 7 | **`Finance` vs `FINANCE` role string case** | `role_name` vs `role` field mapping via `normalizeUser()` suggests historical inconsistency | Data quality risk |
| 8 | **`CORS` middleware double-applied** | `main.py` adds two `CORSMiddleware` layers — one strict, one wildcard (`"*"`) | The wildcard open CORS overrides the strict config |
| 9 | **`auth.py` blacklists tokens upon creation** | `_blacklist_token` is called on every `/login` and `/refresh`, immediately invalidating fresh tokens | **CRITICAL BUG** — users cannot complete authentication |
| 10 | **License `machine_fingerprint` vs `hardware_id`** | Two different fields for the same purpose; unclear which is authoritative | Data model redundancy |

### 3.2 Logic Contradictions

| # | Contradiction | Location | Impact |
|---|-------------|----------|--------|
| 1 | **Payroll endpoints in `finance.py`** | HR and Finance both claim payroll; endpoints are only in finance router | Domain boundary violation |
| 2 | **`is_setup_complete` in `School` vs `/setup/status`** | `School.is_setup_complete` is a boolean but `/setup/status` recomputes it | Source of truth split between DB and runtime logic |
| 3 | **`Student.status` vs `User.is_active`** | Student records can be "suspended" without affecting the linked `User` account, but login logic checks `User.is_active` only | Inactive students might still have portal access |
| 4 | **Wallet balance stored in `Wallet.balance` but computed from transactions** | `Wallet.balance` is a column, but transactions also exist; no trigger ensures they match | Risk of balance drift |
| 5 | **`Invoice.paid_amount` vs sum of `Payment` records** | Invoice paid amount is stored on the invoice but not automatically updated when payments are recorded | Manual / inconsistent paid status |
| 6 | **`CafeteriaOrder.total` vs sum of order items** | Total is stored independently with no DB constraint or app-level validation | Over/under-charging risk |
| 7 | **`AcademicYear.is_current` uniqueness** | No DB constraint prevents multiple `is_current=True` rows | Academic integrity risk |

---

## 4. Missing Security Features

### 4.1 Authentication & Session Security
| # | Missing Feature | Risk Level |
|---|----------------|------------|
| 1 | **Token blacklist bug** (blacklisting on creation) | 🔴 CRITICAL — Authentication is broken |
| 2 | **No rate limiting on refresh endpoint** | 🟠 HIGH — Refresh token brute force possible |
| 3 | **No device / IP binding on sessions** | 🟠 HIGH — Token theft enables full account takeover from any device |
| 4 | **No session revocation from backend** | 🟡 MEDIUM — Can't force-logout users |
| 5 | **JWT token never rotates on use** (outside of refresh) | 🟡 MEDIUM — Stolen tokens valid for full 30-minute window |
| 6 | **No binding between `access_token` and `refresh_token`** | 🟠 HIGH — Refresh token stolen = indefinite access |
| 7 | **Password reset token not invalidated after use** | 🟡 MEDIUM — Replay attack possible on password reset |

### 4.2 Authorization
| # | Missing Feature | Risk Level |
|---|----------------|------------|
| 1 | **No `school_id` / `branch_id` filtering on many endpoints** | 🟠 HIGH — Users from School A can access School B data by changing IDs |
| 2 | **No action-level permissions** (only role-based) | 🟡 MEDIUM — A Finance user can create journal entries AND reverse them |
| 3 | **`Role.level` field exists but is never used** | 🟡 MEDIUM — Hierarchy not enforced |
| 4 | **`is_superuser` bypasses all permissions** | 🟡 MEDIUM — Overly permissive; no granular superuser controls |
| 5 | **No resource ownership checks** | 🟠 HIGH — Any authenticated user can view/edit any student's data if they know the ID |

### 4.3 Data Protection
| # | Missing Feature | Risk Level |
|---|----------------|------------|
| 1 | **No database encryption at rest** (TDE) | 🟡 MEDIUM — PostgreSQL data is plaintext |
| 2 | **PII fields not marked or encrypted** (student DOB, medical notes, emergency contact) | 🟠 HIGH — Privacy regulation risk (GDPR, FERPA) |
| 3 | **No data masking in API responses** | 🟡 MEDIUM — Full phone/address exposed to all roles |
| 4 | **Audit logs do not log before/after values** | 🟡 MEDIUM — Can't reconstruct data changes |
| 5 | **No automated PII purging** (for deleted students) | 🟡 MEDIUM — Soft delete retains all PII indefinitely |
| 6 | **CSP allows `'unsafe-eval'`** | 🟡 MEDIUM — XSS risk is elevated |

### 4.4 Network & Infrastructure
| # | Missing Feature | Risk Level |
|---|----------------|------------|
| 1 | **Wildcard CORS on second middleware** | 🔴 CRITICAL — `allow_origins=["*"]` for GET/HEAD breaks isolation |
| 2 | **No HSTS header** | 🟠 HIGH — HTTP downgrade possible |
| 3 | **SSL/TLS not configured** | 🟠 HIGH — All traffic plaintext in production |
| 4 | **No WAF / request signature validation** | 🟡 MEDIUM — Bot/scraping vulnerability |
| 5 | **No request size limits on file uploads** | 🟡 MEDIUM — DoS via massive Excel uploads |
| 6 | **No SQL injection audit on raw queries** | 🟡 MEDIUM — Some endpoints use raw SQL that may be injectable |

---

## 5. Missing Business Rules

### 5.1 Academic
| # | Missing Rule | Description |
|---|-------------|-------------|
| 1 | **Promotion constraints** | Students cannot be promoted to a grade they haven't passed prerequisites for |
| 2 | **Class capacity enforcement** | Sections can be over-enrolled; no waitlist logic |
| 3 | **Teacher workload limits** | Teachers can be assigned unlimited sections/subjects |
| 4 | **Exam scheduling conflicts** | Two exams can be scheduled for the same class at the same time |
| 5 | **Grade validation** | `ExamResult.grade` is a free-text string; no score-to-grade mapping enforced |

### 5.2 Financial
| # | Missing Rule | Description |
|---|-------------|-------------|
| 1 | **Double-entry balance enforcement** | DB-level trigger or app-level constraint to ensure Debits = Credits per journal entry |
| 2 | **Payment overage prevention** | `Payment.amount` can exceed `Invoice.balance` |
| 3 | **Budget overage alerts** | Budgets are stored but no enforcement on spending |
| 4 | **Scholarship + fee combination** | No rule preventing scholarship + full fee payment |
| 5 | **Transaction reversal audit trail** | Reversed journal entries lack mandatory reversal reason in DB |

### 5.3 HR
| # | Missing Rule | Description |
|---|-------------|-------------|
| 1 | **Contract overlap prevention** | Two active contracts for the same employee |
| 2 | **Leave balance negative prevention** | Leave requests can be approved that exceed available balance |
| 3 | **Attendance mark authorization** | Teachers can't mark their own attendance; not enforced |
| 4 | **Performance review frequency year's gap** | No minimum time between reviews cycles |

### 5.4 Library
| # | Missing Rule | Description |
|---|-------------|-------------|
| 1 | **Borrowing limit enforcement** | No max books per member |
| 2 | **Overdue penalty auto-accrual** | Fines don't auto-calculate based on days overdue |
| 3 | **Book return before borrow** | No validation that return_date > borrow_date |

---
以德报怨，何以报德？(What virtue is there in returning kindness for injury?)

## 6. Missing Documentation

| # | Document | Status | Priority |
|---|---------|--------|----------|
| 1 | **API Documentation** (OpenAPI/Swagger beyond auto-generated) | Missing — auto-generated `/docs` doesn't explain business logic | HIGH |
| 2 | **Database Schema Diagram (ERD)** | Missing — 52 models with relationships not visualized | HIGH |
| 3 | **Deployment Guide** (production server, DB, SSL, env vars) | Missing — only `PROGRESS.md` with dev commands | CRITICAL |
| 4 | **Architecture Decision Records (ADRs)** | Missing — no design rationale captured | MEDIUM |
| 5 | **Security Runbook** (incident response, key rotation) | Missing | CRITICAL |
| 6 | **Role & Permission Matrix** | Implicit in code; no single source of truth | HIGH |
| 7 | **API Client Guide** (for 3rd party integrations) | Missing | MEDIUM |
| 8 | **Database Migration Playbook** (rollback strategies) | Missing — Alembic has no documented procedures | HIGH |
| 9 | **User Manual / Training Guide** | Missing | MEDIUM |
| 10 | **Test Plan & QA Checklist** | Missing | CRITICAL |

---

## 7. Missing APIs

### 7.1 Core Gaps
| # | Missing API | Description |
|---|------------|-------------|
| 1 | **Bulk operations API** (bulk delete, bulk update) | Only bulk import exists; no bulk logical delete or status change |
| 2 | **Reporting API (ad-hoc queries)** | Financial reports exist, but no general-purpose ad-hoc query builder |
| 3 | **Export all data API** (GDPR data portability) | No "download all my data" endpoint per user |
| 4 | **Webhook API** | No way for external systems to subscribe to events |
| 5 | **Audit log query API with filtering** | `/audit-logs` exists but lacks advanced filtering (date range, user, action type) |
| 6 | **Notification dispatch API** (send email/SMS/push to subset of users) | Toggles exist but no dispatch endpoint |
| 7 | **System configuration API** | No way to read/write school-wide settings via API |
| 8 | **Data archival / restore API** | Soft-deleted entities can't be restored via API |
| 9 | **Parent-student link validation API** | Linking lacks validation (e.g., same household, guardianship proof) |
| 10 | **QR/NFC transaction API** | No API to link QR/NFC to wallet or fee payment transactions |

---

## 8. Missing Database Relationships

### 8.1 Orphaned / Incomplete Relationships
| # | Missing Relationship | Description |
|---|---------------------|-------------|
| 1 | **`User` <-> `Student`** | `Student.user_id` exists but `User` has no backref to `Student`; can't query a user's student profile |
| 2 | **`User` <-> `TeacherProfile`** | `TeacherProfile.user_id` exists but no `user.teacher_profile` relationship |
| 3 | **`Student` <-> `Wallet`** | `Wallet.student_id` but no `student.wallet` relationship (laziness or oversight) |
| 4 | **`Invoice` <-> `Payment`** | No explicit FK from `Payment` to `Invoice`; only implicit journal linkage |
| 5 | **`Exam` <-> `ExamResult`** | `ExamResult.exam_id` exists but `Exam.results` backref missing |
| 6 | **`TimetableEntry` <-> `Teacher` / `Classroom`** | Timetable references class/section/subject but not assigned teacher or room |
| 7 | **`Classroom` underutilization** | `Classroom` model exists but isn't linked to timetable or capacity management |
| 8 | **No `SchoolSettings` backref to `School`** | `SchoolSettings.school_id` but `School.settings` not defined |
| 9 | **No `NotificationPreference` -> `User` backref** | Preference row exists but no `user.notification_preference` |

### 8.2 Missing Junction / Association Tables
| # | Missing Table | Description |
|---|--------------|-------------|
| 1 | **`parent_student_link` lacks constraint** | No unique constraint on `(parent_id, student_id)` — duplicate links possible |
| 2 | **`teacher_subject` junction table** | `TeacherSubject` model may exist but isn't imported in `__init__.py` |
| 3 | **`user_role_history`** | No tracking of role changes over time (audit gap) |
| 4 | **`fee_assignment` lacks term/semester link** | Fee assignments don't reference which term they apply to |

---

## 9. Missing UI Screens

### 9.1 Critical Missing Screens
| # | Screen | Navigation | Priority |
|---|--------|-----------|----------|
| 1 | **Student detail view** | `/registrar/students/[id]` exists as file but isn't rendered fully | HIGH |
| 2 | **Teacher detail view** | `/director/teachers/[id]` — not implemented | HIGH |
| 3 | **Employee detail view** | `/hr/employees/[id]` — not implemented | HIGH |
| 4 | **Invoice detail / payment allocation** | Finance module lists invoices but no detail/payment screen | HIGH |
| 5 | **Payment receipt / print view** | No printable receipt for parents after payment | HIGH |
| 6 | **Journal entry detail with line items** | No drill-down into double-entry transactions | MEDIUM |
| 7 | **School detail (Super Admin)** | `/super-admin/schools/[id]` not present | MEDIUM |
| 8 | **License detail / history** | `/super-admin/licenses/[id]` not present | MEDIUM |
| 9 | **Parent-Student link management UI** | No dedicated screen to manage guardian relationships | MEDIUM |
| 10 | **Role permission editor** | Roles are hardcoded; no admin screen to modify permissions | MEDIUM |
| 11 | **System-wide notification composer** | No UI to send announcements to specific roles/grades | MEDIUM |
| 12 | **Data import preview / error report** | Bulk import doesn't show per-row validation results | MEDIUM |
| 13 | **Profile / account settings for all roles** | Only Admin has "School Profile"; individual user settings missing | MEDIUM |
| 14 | **Password change / security settings** | No "Change Password" screen for logged-in users | MEDIUM |

### 9.2 Mobile-Specific
| # | Screen | Priority |
|---|--------|----------|
| 1 | **Mobile-optimized POS (Cafeteria)** | HIGH |
| 2 | **Mobile attendance marking** | HIGH |
| 3 | **Push notification inbox** | MEDIUM |

---

## 10. Missing User Roles

### 10.1 Currently Defined Roles (13)
- SUPER_ADMIN, ADMIN, DIRECTOR, REGISTRAR, TEACHER, FINANCE, HR, INVENTORY, LIBRARY, CAFETERIA, AUDITOR, PARENT, STUDENT

### 10.2 Missing / Needed Roles
| # | Missing Role | Justification |
|---|-------------|---------------|
| 1 | **COUNSELOR / GUIDANCE** | Mental health, career counseling, student wellbeing — increasingly critical |
| 2 | **NURSE / MEDICAL STAFF** | Medical records, immunization tracking, triage — distinct from registrar |
| 3 | **SECURITY / GATE GUARD** | Visitor management, vehicle tracking, late arrival marking — needs limited access |
| 4 | **BUS MANAGER / TRANSPORT** | Route management, student pickup/drop-off, vehicle maintenance |
| 5 | **ALUMNI** | Transcript requests, donation portal, events — some schools need |
| 6 | **GUEST / AUDITOR EXTERNAL** | External auditor access (limited, read-only, time-bound) |
| 7 | **SYSADMIN / IT STAFF** | Different from SUPER_ADMIN; manages local infrastructure, not business logic |
| 8 | **ACCOUNTANT (read-only Finance)** | Distinct from Finance (read-write); for external bookkeepers laurentiuvladus | ... continuing from where the cut happened with the same content |

---

## 11. Architecture Summary

### 11.1 High-Level Architecture
```
  [Client Browser]
        |
    [Next.js 16 (Frontend)]  --- Edge Middleware (Auth, CSRF, Role Routing)
        |                                        |
        +--- API Routes --- [FastAPI Backend] --- PostgreSQL (Primary)
        |                                        |
        +--- Static Assets                       +--- Redis (Session/Cache/Rate Limiting)
                                                |
                                                +--- File Storage (Logo uploads, Excel)
```

### 11.2 Authentication Flow
```
  User  --POST /api/v1/auth/login-->  FastAPI (bcrypt + JWT)
    |                                  |
    |  <--access_token (HttpOnly)      +---> Redis (brute-force tracking)
    |  <--refresh_token (HttpOnly)         |
    |  <--user_role (client cookie)        +---> AuditLog (login event)
    |
  Browser stores cookies -> All subsequent API calls include CSRF token header
    |
  Next.js Middleware reads 'user_role' cookie -> routes to dashboard
    |
  Axios interceptor handles 401 -> auto-refresh via /auth/refresh
```

### 11.3 Data Access Pattern
- All models are soft-delete (`deleted_at IS NULL`)
- All endpoints should (but don't always) filter by `school_id` / `branch_id`
- Audit logging wraps major CRUD operations
- Double-entry journal: `JournalEntry` (parent) has 2+ `JournalLine` children
- License validation on startup reads the active license from DB

---

## 12. Dependency Map

### 12.1 Frontend Dependencies (Runtime)
```
next@16.2.9
├── react@19.2.4
├── react-dom@19.2.4
├── @radix-ui/* (primitives: avatar, dialog, dropdown, label, select, separator, slot, tabs, toast)
├── @react-three/drei + @react-three/fiber + three (3D scenes)
├── framer-motion (animations)
├── recharts (charts)
├── axios (HTTP client)
├── lucide-react (icons)
├── class-variance-authority + clsx + tailwind-merge (styling utilities)
├── next-themes (theme management)
└── @types/* (type definitions)
```

### 12.2 Backend Dependencies
```
python (3.12+ recommended)
├── fastapi (web framework)
├── uvicorn[standard] (ASGI server)
├── sqlalchemy (ORM)
├── alembic (migrations)
├── psycopg2-binary (PostgreSQL driver)
├── pydantic + pydantic-settings (validation)
├── python-jose[cryptography] (JWT)
├── passlib[bcrypt] (password hashing)
├── redis (cache/rate-limiting)
├── httpx (HTTP client)
├── cryptography (license/crypto)
├── email-validator
├── openpyxl (Excel import/export)
└── pytest + pytest-asyncio (testing)
```

### 12.3 Frontend → Backend Service Mapping
```
Feature          | Frontend Service              | Backend Endpoint
---------------  | ----------------------------  | ------------------
Auth             | authService                   | /api/v1/auth/*
Students         | studentService                | /api/v1/students
Parents          | parentService                 | /api/v1/parents
Teachers         | teacherService                | /api/v1/teachers
Staff            | staffService                  | /api/v1/staff
Academic         | academicService               | /api/v1/(classes/sections/subjects/exams/timetable/academic-years)
Finance (COA)    | financeService.accounts       | /api/v1/accounts
Finance (Journal)| financeService.journalEntries | /api/v1/journal-entries
Invoices         | financeService.invoices       | /api/v1/invoices
Payments         | financeService.payments       | /api/v1/payments
Fee Structure    | financeService.feeStructures  | /api/v1/fee-structures
Budgets          | financeService.budgets        | /api/v1/finance/budgets
Expenses         | financeService.expenses       | /api/v1/finance/expenses
HR Contracts     | hrService.contracts           | /api/v1/contracts
Leave            | hrService.leaveRequests       | /api/v1/leave-requests
Attendance       | hrService.attendance          | /api/v1/attendance
Inventory        | inventoryService              | /api/v1/inventory/*
Library          | libraryService                | /api/v1/library/*
Cafeteria        | cafeteriaService              | /api/v1/cafeteria/*
Audit            | auditService                  | /api/v1/audit-logs
Setup/Activate   | setupService                  | /api/v1/setup/*, /api/v1/activate/*
QrCodes          | qrService                     | /api/v1/qr/*
NfcCards         | nfcService                    | /api/v1/nfc/*
```

---

## 13. Data Flow Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                       BROWSER                                 │
│  (Next.js 16 App Router, Edge Middleware, Cookie-based Auth, Axios + R3F)    │
└────────────────┬─────────────────────────────────────────────────────────────┘
                 │
                 │ HTTPS (currently HTTP)
                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              NGINX LOAD BALANCER                             │
│                    (SSL Termination, Static Assets, Proxy)                   │
└────────────────┬─────────────────────────────────────────────────────────────┘
                 │
                 │ HTTP / WSGI
                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                    FASTAPI APP                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ Auth Router    │  │ Domain Routers │  │ Domain Routers │  │ Health/Setup │  │
│  │ /auth/*        │  │ /students/*    │  │ /finance/*     │  │ /health/     │  │
│  │ JWT + bcrypt   │  │ CRUD + filters │  │ Double-entry   │  │ Set setup    │  │
│  │ Brute force    │  │ Bulk import    │  │ accounting     │  │ /activate/   │  │
│  │ rate limiting  │  │ QR/NFC gen     │  │ reports        │  │ API docs     │  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  └──────────────┘  │
│          │                   │                   │                            │
│          └───────────────────┴───────────────────┴────────────────────────────┘
│                                              │
│                                              ▼
│                         ┌──────────────────────────┐
│                         │   SQLAlchemy ORM (v2)   │
│                         │  Session-per-request    │
│                         │  Soft-delete filter     │
│                         └───────┬──────────────────┘
│                                 │
│                                 ▼
│                    ┌──────────────────────────┐
│                    │      PostgreSQL 16       │
│                    │  (School-scoped row     │
│                    │   level access not yet   │
│                    │   implemented)           │
│                    └──────────────────────────┘
│                                 │
│                    ┌────────────┴────────────┐
│                    ▼                         ▼
│            ┌─────────────┐          ┌──────────────┐
│            │    Redis    │          │  File System │
│            │  Sessions   │          │  (temporary  │
│            │  Rate Limit │          │   uploads)     │
│            │  Token BL   │          └──────────────┘
│            └─────────────┘
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Data Flows

**1. User Authentication Flow:**
```
Client (Next.js) ---POST /auth/login---> FastAPI JWT auth ---Redis brute-force check
      ^                                                              |
      |                                                              v
  Set cookies (access_token, refresh, user_role) <--- Issue JWT <--- Validated + logged
      |
   Next.js Middleware reads user_role cookie -> redirects to role dashboard
```

**2. Student Registration Flow:**
```
Registrar UI ---POST /students---> FastAPI auth check ---SQLAlchemy create Student
      |                                                           |
      |                                                           v
   Reflect new student <--- Return student record <--- Log to AuditLog
```

**3. Fee Payment Flow (Designed but Partially Inert):**
```
Finance UI ---POST /payments---> Validate invoice exists, calculate balance
      |                                                      |
      |                                                      v
  Success response                           Create JournalEntry + JournalLines
      |                                          (Debit Cash, Credit Fees Receivable)
      |                                                      |
      |                                                      v
   Update Invoice paid_amount              Update Student Wallet (if wallet used)
      |
   Generate receipt (not yet implemented)
```

**4. Library Borrowing Flow:**
```
Library UI ---POST /library/borrow---> Check book availability
      |                                                    |
      |                                                    v
   Success response                          Create BookBorrowing record
      |                                          Decrement book.available_quantity
      |                                          Set due_date, fine_amount=0
      |                                                    |
      |                                                    v
                                               Log to AuditLog
```

---

## 14. Risk Report

### 14.1 Critical Risks (Immediate Action Required)
| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **Token blacklisting on creation makes auth unusable** | Certain | Very High | Fix `_blacklist_token` call in `/login` and `/refresh` |
| 2 | **No automated testing exists** | Currently blocking | Very High | Establish testing framework immediately |
| 3 | **Wildcard CORS middleware nullifies security** | Currently active | Very High | Remove the open CORS layer in `main.py` |
| 4 | **No database backups** | High | Very High | Implement automated backup scripts |
| 5 | **No school_id/branch_id filtering on APIs** | High | High | Add tenant filtering middleware |

### 14.2 High Risks
| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **No email service means password reset non-functional** | Certain | High | Integrate email provider (SendGrid/SES) |
| 2 | **PII stored in plaintext** | Likely | High | Encrypt sensitive fields, implement data masking |
| 3 | **Large portions of frontend use mock data** | Certain | High | Connect all pages to real API endpoints |
| 4 | **No CI/CD means manual deployment errors** | Likely | Medium | Set up GitHub Actions / GitLab CI |
| 5 | **Production environment not configured** | Likely | High | Create `.env.example` and production configs |

### 14.3 Medium Risks
| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **Wallet balance drift** (no DB constraint) | Possible | Medium | Add trigger + periodic reconciliation |
| 2 | **Hardcoded demo credentials** | Likely | Medium | Remove from seed scripts |
| 3 | **No request size limits on file uploads** | Possible | Medium | Configure upload limits |
| 4 | **Frontend bundle size with Three.js** | Likely | Low | Implement lazy loading / code splitting |
| 5 | **Next.js SWC fallback to WASM** | Currently active | Low | Resolve or document acceptable performance |

---

## 15. Recommended Improvements

### 15.1 Immediate (This Sprint)
1. **Fix token blacklisting bug** — Remove `_blacklist_token` calls from `/login` and `/refresh`; only blacklist on logout.
2. **Remove wildcard CORS** — Delete the second `CORSMiddleware` in `main.py`.
3. **Add `.env.example`** — Document all required environment variables.
4. **Write at least 10 critical test cases** — Start with auth, login brute force, and role-based access.
5. **Add school/branch filtering middleware** — Every API request must include `school_id` check.

### 15.2 Short-Term (Next 2-4 Weeks)
6. **Integrate an email service** — Start with SendGrid/SES for password reset.
7. **Implement WebSocket notifications** — Replace 30s polling with Socket.IO or native WebSockets.
8. **Connect all frontend pages to real APIs** — Eliminate mock data; add loading/error states.
9. **Implement automated invoice generation** — Cron job or scheduled task for recurring fees.
10. **Add library fine auto-calculation** — Daily cron or trigger on due date check.
11. **Implement payroll calculation logic** — Connect PayrollRun to contracts/attendance.
12. **Add pagination to all list endpoints** — Prevent unbounded queries.
13. **Implement print-friendly/PDF receipt generation** — Use react-pdf or similar.

### 15.3 Medium-Term (1-3 Months)
14. **Implement multi-factor authentication** — TOTP for Super Admin and Finance roles.
15. **Add payment gateway integration** — Stripe/Flutterwave for fee payments, wallet top-ups.
16. **Implement data encryption at rest** — Use PostgreSQL TDE or application-level encryption.
17. **Add comprehensive audit trail** — Include before/after values in AuditLog.
18. **Implement role permission matrix editor** — Make roles configurable per school.
19. **Build missing detail views** — Student detail, teacher detail, invoice detail.
20. **Add missing navigation roles** (Bus Manager, Nurse, Counselor, etc.).
21. **Implement data export/import for migrations** — Support competitor formats.
22. **Dockerize the application** — `Dockerfile` and `docker-compose.yml`.
23. **Set up CI/CD pipeline** — Automated testing and deployment.

### 15.4 Long-Term (3-6 Months)
24. **Mobile app (React Native)** — Parent and Student portals.
25. **Advanced BI & Analytics dashboards** — Phase 12.
26. **AI-powered insights** — Attendance prediction, at-risk student alerts.
27. **SSO / OAuth integration** — Google Workspace, Microsoft 365.
28. **Third-party integrations** — Google Calendar, Slack, Telegram bots fully functional.
29. **Compliance certifications** — SOC 2, ISO 27001 readiness.
30. **Disaster recovery & backup automation** — Automated daily backups with point-in-time recovery.

---

## Appendix A: Complexity Assessment

| Module | Backend Complexity | Frontend Complexity | Integration Gap |
|--------|-------------------|--------------------|-----------------|
| Auth | Medium | Medium | Token bug is critical |
| Academic | High | Medium | High — mock data prevalent |
| Finance | Very High | High | Critical — no payment gateway |
| HR | High | Medium | High — payroll not connected |
| Inventory | Medium | Low | Medium |
| Library | Medium | Low | Medium |
| Cafeteria | Medium | Medium | High — POS not real-time |
| Communication | Low | Low | Very High — no real-time |
| Audit | Low | Low | Low |
| Super Admin | Medium | High | Medium — some mock data |

---

*End of Report*
