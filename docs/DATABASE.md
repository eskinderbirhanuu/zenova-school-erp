# Database Design

## Overview

PostgreSQL 16 database with 52+ ORM models via SQLAlchemy 2.0. Migrations via Alembic. No hard delete — all major entities use `deleted_at` for soft deletion. Multi-tenant via `school_id` / `branch_id` foreign keys across most models.

## Core System Models

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | Login credential |
| hashed_password | VARCHAR(255) | bcrypt hash |
| full_name | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| photo_url | VARCHAR(500) | Nullable |
| is_active | BOOLEAN | Default TRUE |
| is_superuser | BOOLEAN | Default FALSE |
| is_view_only | BOOLEAN | Set by network middleware |
| must_change_password | BOOLEAN | Default FALSE |
| last_login_at | DATETIME | Nullable |
| role_id | UUID FK → roles.id | |
| school_id | UUID FK → schools.id | Nullable for SUPER_ADMIN |
| branch_id | UUID FK → branches.id | |
| deleted_at | DATETIME | Soft delete |

### roles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) UNIQUE | SUPER_ADMIN, ADMIN, etc. |
| level | INTEGER | 10–100 hierarchy |
| description | TEXT | |
| is_active | BOOLEAN | Default TRUE |

### schools
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| code | VARCHAR(50) UNIQUE | Short code |
| address | TEXT | |
| phone | VARCHAR(50) | |
| email | VARCHAR(255) | |
| logo_url | VARCHAR(500) | |
| website | VARCHAR(255) | |
| settings | JSONB | School configuration |
| is_active | BOOLEAN | |
| deleted_at | DATETIME | |

### branches
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| school_id | UUID FK → schools.id | |
| deleted_at | DATETIME | |

### licenses
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| key | VARCHAR(255) UNIQUE | License key |
| license_type | ENUM | trial, monthly, yearly, lifetime |
| status | ENUM | active, expired, suspended, revoked |
| school_id | UUID FK → schools.id | |
| branch_id | UUID FK → branches.id | |
| valid_from | DATETIME | |
| valid_until | DATETIME | Nullable (lifetime) |
| machine_fingerprint | VARCHAR(255) | Hardware binding |
| offline_grace_start | DATETIME | Nullable |

## Identity Models

### students
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| student_id | VARCHAR(50) UNIQUE | STU-2026-00001 |
| first_name | VARCHAR(100) | |
| middle_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| gender | VARCHAR(10) | male, female |
| date_of_birth | DATE | |
| grade_id | UUID FK → classes.id | |
| section_id | UUID FK → sections.id | |
| academic_year_id | UUID FK → academic_years.id | |
| status | VARCHAR(20) | active, transferred, graduated, withdrawn |
| school_id | UUID FK → schools.id | |
| registered_by | UUID FK → users.id | |
| user_id | UUID FK → users.id | For student portal |
| deleted_at | DATETIME | |

### parents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| parent_id | VARCHAR(50) UNIQUE | PAR-2026-00001 |
| full_name | VARCHAR(255) | |
| phone_1 | VARCHAR(50) | |
| phone_2 | VARCHAR(50) | |
| national_id | VARCHAR(100) | Unique per school |
| school_id | UUID FK → schools.id | |
| user_id | UUID FK → users.id | For parent portal |
| deleted_at | DATETIME | |

### parent_student_links
| Column | Type | Notes |
|--------|------|-------|
| parent_id | UUID FK → parents.id | |
| student_id | UUID FK → students.id | |
| relationship | VARCHAR(50) | Override per link |
| is_primary | BOOLEAN | |
| school_id | UUID FK → schools.id | |
| PK | (parent_id, student_id) | |

### teacher_profiles / staff_profiles
Profiles linked 1:1 to `users` with auto-generated IDs (TCH-2026-00001, STF-2026-00001).

## Academic Models

- **academic_years**, **semesters** — Academic calendar
- **classes** (grades), **sections** — Class structure
- **subjects** — Per-school subjects
- **classrooms** — Physical rooms
- **timetable_entries** — Class schedule
- **exam_types**, **exams**, **exam_results** — Assessment
- **report_cards**, **promotion_records** — Student progression
- **attendance** — Daily attendance records

## Finance Models

- **accounts** — Chart of Accounts (tree structure)
- **journal_entries**, **journal_lines** — Double-entry transactions
- **accounting_periods** — Lockable periods
- **fee_types**, **fee_structures**, **fee_assignments** — Billing
- **invoices**, **invoice_lines** — Student invoices
- **payments** — Payment records
- **wallets**, **wallet_transactions** — Student wallet
- **scholarships** — Fee discounts
- **budgets**, **budget_items** — Department budgets
- **payroll_runs**, **payroll_items** — Payroll
- **purchase_requests**, **purchase_orders**, **goods_receipts** — Procurement

## HR Models

**employee_contracts**, **leave_types**, **leave_requests**, **leave_balances**, **performance_reviews**, **recruitment**

## Inventory Models

**inventory_categories**, **inventory_items**, **stock_movements**, **suppliers**, **assets**

## Library Models

**book_categories**, **books** (ISBN), **book_borrowings**, **book_fines**, **library_members**

## Cafeteria Models

**cafeteria_products**, **cafeteria_orders**, **cafeteria_order_items**

## Communication Models

**announcements**, **events**, **messages**, **notification_preferences**

## Other Models

- **qr_codes** — QR identity tokens
- **nfc_cards** — NFC card assignments
- **audit_logs** — All mutation records
- **number_sequences** — ID generation sequences

## Migration: school_id Addition

Added `school_id` column to 21 tables (June 29, 2026) to fix cross-school data leaks:

`audit_logs`, `employee_contracts`, `exam_types`, `exams`, `exam_results`, `notification_preferences`, `parent_student_links`, `performance_reviews`, `promotion_records`, `report_cards`, `roles`, `scholarships`, `sections`, `staff_profiles`, `subjects`, `teacher_grade_assignments`, `teacher_profiles`, `teacher_section_assignments`, `timetable_entries`, `wallets`, `wallet_transactions`

**Note:** Alembic is configured but not fully adopted — `Base.metadata.create_all` is used at startup. Production deployment should use proper Alembic migrations.

## Models with `deleted_at` (Correct)

User, Student, Parent, Branch — plus 54+ models that still lack `deleted_at` (see REVIEWS.md for the full list).
