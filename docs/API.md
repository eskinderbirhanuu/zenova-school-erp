# API Reference

## Overview

REST API at `/api/v1` prefix. 70+ endpoint files, 300+ routes. All endpoints return JSON. Authentication via JWT HttpOnly cookies. Auto-refresh on 401 via Axios interceptor.

## Conventions

- **List endpoints**: `?page=1&page_size=50` pagination
- **Create**: POST with JSON body
- **Read**: GET by ID
- **Update**: PATCH (preferred) or PUT
- **Delete**: Soft delete (`deleted_at`), returns 204
- **School scoping**: All queries filtered by `current_user.school_id`
- **Rate limiting**: Redis-backed token bucket per IP per endpoint group

### Response Format

All responses use standard JSON. List endpoints return `{"items": [...], "total": N, "page": N, "page_size": N}` where paginated.

**Success (200/201)**:
```json
{"id": "uuid", "email": "user@school.com", ...}
```

**Error**:
```json
{"detail": "Human-readable error message"}
```
HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation), 429 (rate limited), 500 (server error).

Validation errors use FastAPI standard:
```json
{"detail": [{"loc": ["body", "email"], "msg": "field required", "type": "value_error.missing"}]}
```

### Authentication

All endpoints (except auth/activate/setup/health) require a valid `access_token` HttpOnly cookie. Tokens are 30-minute JWTs. The Axios interceptor auto-refreshes on 401 via `POST /api/v1/auth/refresh`.

**Cookie bundle** (set on login/refresh):
| Cookie | Type | Max-Age | Purpose |
|--------|------|---------|---------|
| `access_token` | HttpOnly | 30 min | API auth |
| `refresh_token` | HttpOnly | 7 days | Token refresh |
| `user_role` | Client | 7 days | Frontend routing |
| `user_roles` | Client | 7 days | Multi-role routing |

## Endpoints by Module

### Auth (`/api/v1/auth/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /login | Public | Login by email or employee_id + password |
| POST | /register | Public | Self-register as PARENT or STUDENT |
| POST | /refresh | Public (cookie) | Refresh access/refresh token pair (rotation + reuse detection) |
| POST | /logout | Required | Blacklist tokens, clear cookies |
| POST | /forgot-password | Public | Request password reset email |
| POST | /reset-password | Public | Reset password with token from email |
| GET | /me | Required | Current user profile + permissions |
| GET | /me/employee-id | Required | Get own employee ID |
| POST | /mfa/setup | Required | Generate TOTP secret + QR code |
| POST | /mfa/verify | Required | Verify TOTP code, enable MFA, return backup codes |
| POST | /mfa/disable | Required | Disable MFA (requires password) |
| POST | /mfa/backup-codes | Required | Regenerate backup codes |
| POST | /mfa/login | Public (mfa_token) | Complete MFA step-up login |
| POST | /change-password | Required | Change password (requires old password) |

### Password Recovery (`/api/v1/auth/recovery/`)
Offline-first hierarchical recovery chain.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /initiate | Public | Initiate recovery by email or employee_id |
| POST | /approve | Required | Approve recovery request (hierarchy-based) |
| POST | /generate-temp-password | Required | Generate temp password for approved request |
| POST | /recovery-codes/generate | Required | Generate 10 single-use recovery codes |
| GET | /recovery-codes/list | Required | List recovery codes (masked) |
| POST | /recovery-codes/verify | Public | Verify a recovery code |
| POST | /recovery-codes/apply | Public | Apply password change with verified recovery code |
| POST | /emergency/token | Required | Generate emergency token (super admin only) |
| POST | /emergency/apply | Public | Apply password reset with emergency token |
| GET | /audit | Required | Recovery action audit trail |

### Activation / Setup (`/api/v1/activate/`)
First-run license activation and school setup.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /status | Public | Check if system is activated |
| POST | /validate | Public | Verify license key validity |
| POST | /initialize | Public | Full setup: validate key + create school + admin |
| POST | /validate-type | Public | Validate key and return MAIN/BRANCH type |
| POST | /initialize-main | Public | Activate with MAIN key (school + admin) |
| POST | /initialize-branch | Public | Activate branch with BRANCH key |
| POST | /employees/create | Director+ | Create employee with auto-generated ID |
| POST | /recovery/issue | Admin+ | Issue time-bound recovery code (600s TTL) |
| POST | /recovery/reset | Public | Reset password using recovery code |
| POST | /verify-super-admin-contact | Public | Verify Super Admin contact (oracle-safe) |

### Setup Wizard (`/api/v1/setup/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /wizard-status | Required | Check setup steps progress (academic years, classes, sections, subjects, teachers) |

### Schools (`/api/v1/schools/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Super Admin | List schools |
| POST | / | Super Admin | Create school |
| GET | /me | Required | Get current school profile |
| PATCH | /me | School Owner+ | Update school profile |
| POST | /activate | Super Admin | Activate school license |

### Branches (`/api/v1/branches/`)
CRUD for school branches. Director+ scope.

### Users (`/api/v1/users/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Admin+ | List users |
| POST | / | Admin+ | Create user |
| GET | /{id} | Admin+ | User detail |
| PATCH | /{id} | Admin+ | Update user |

### Roles (`/api/v1/roles/`)
CRUD for roles. 13 built-in roles: SUPER_ADMIN, OWNER, DIRECTOR, ADMIN, TEACHER, FINANCE, HR, REGISTRAR, LIBRARIAN, CAFETERIA, INVENTORY, PARENT, STUDENT.

### Permissions (`/api/v1/permissions/`)
List and assign granular permissions.

### Students (`/api/v1/students/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Registrar+ | List students (paginated, filterable) |
| POST | / | Registrar+ | Register student |
| GET | /{id} | Staff+ | Student detail |
| PATCH | /{id} | Registrar+ | Update student |
| GET | /{id}/transcript | Staff+ | Cumulative transcript (grades across semesters) |

### Parents (`/api/v1/parents/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Registrar+ | List parents |
| POST | / | Registrar+ | Create parent |
| POST | /{id}/link | Registrar+ | Link parent to student |
| DELETE | /{id}/unlink | Registrar+ | Unlink parent from student |

### Teachers / Staff (`/api/v1/teachers/`, `/api/v1/staff/`)
CRUD for teacher and staff profiles. Director-only creation.

### Academic (`/api/v1/academic/`)
Classes, sections, subjects, timetable, exams, exam results, academic years, semesters. Full CRUD per sub-module.

### Attendance (`/api/v1/attendance/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Teacher+ | List attendance records |
| POST | /bulk | Teacher+ | Mark attendance in bulk |
| GET | /export | Admin+ | Export attendance (CSV/Excel) |

### Finance (`/api/v1/finance/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /accounts | Finance+ | Chart of Accounts |
| POST | /accounts | Finance+ | Create account |
| GET | /journal-entries | Finance+ | Journal entries |
| POST | /journal-entries | Finance+ | Create journal entry |
| GET | /ledger | Finance+ | General Ledger |
| GET | /invoices | Finance+ | Student invoices |
| POST | /invoices | Finance+ | Create invoice |
| GET | /payments | Finance+ | Payment records |
| POST | /payments | Finance+ | Record payment |
| GET | /wallets | Finance+ | Student wallets |
| GET | /budgets | Finance+ | Department budgets |
| GET | /payroll | Finance+ | Payroll runs |
| GET | /reports/* | Finance+ | Financial reports (trial balance, balance sheet, P&L, cash flow) |

### HR (`/api/v1/hr/`)
Contracts, leave management (request/approve/reject), performance reviews, recruitment, attendance.

### Inventory (`/api/v1/inventory/`)
Categories, items, stock movements, suppliers, purchase orders, assets.

### Library (`/api/v1/library/`)
Books, borrowing, returns, fines, members.

### Cafeteria (`/api/v1/cafeteria/`)
Products, orders (PATCH for updates), wallet payments.

### Dashboard / Analytics (`/api/v1/dashboard/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /stats | Required | Role-specific KPIs |
| GET | /grade-distribution | Teacher+ | Grade analytics |
| GET | /staff-distribution | Admin+ | Staff analytics |

### Reports (`/api/v1/reports/`)
Module-specific report endpoints: system, admin, finance, hr, inventory, library, auditor, cafeteria.

### License (`/api/v1/licenses/`)
CRUD for license keys. Generation, activation, renewal, suspension, revocation.

### Audit (`/api/v1/audit-logs/`)
Query audit trail with filtering by action, user, resource, date range.

### Support Tickets (`/api/v1/support/tickets`)
Support ticket system (create, list, update status, assign).

### Messages (`/api/v1/messages/`)
Internal messaging between users within a school.

### Communication (`/api/v1/communication/`)
Announcements, notifications, bulk messaging.

### Events (`/api/v1/events/`)
School events calendar.

### Tags (`/api/v1/tags/`)
Student and teacher tags for grouping/filtering.

### Settings (`/api/v1/settings/`)
School-level configuration settings.

### NFC / QR (`/api/v1/nfc/`, `/api/v1/nfc/v2`, `/api/v1/qr/`)
Assign and manage NFC cards and QR codes for students.

### Scanner (`/api/v1/scanner/`)
QR/NFC scanner endpoints for attendance and payments.

### Report Cards (`/api/v1/report-cards/`)
Generate and view student report cards.

### Card Design (`/api/v1/card-design/`)
Customize student ID card templates (colors, logo, layout).

### Features (`/api/v1/config/features`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /features | Public | List feature flags for frontend |

### Parent Portal (`/api/v1/parent/`)
Parent-specific views: children list, payments, messages, attendance, grades.

### Student Portal (`/api/v1/student/`)
Student-specific views: timetable, grades, attendance, fees.

### IGA (`/api/v1/iga/`)
Inter-Galactic Auth integration for external systems.

### Health (`/api/v1/health/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Public | Full health: DB, Redis, disk, CPU, RAM, sync, backup, uptime |
| GET | /live | Public | Liveness probe (always 200) |
| GET | /ready | Public | Readiness probe (200/503) |

### Backup (`/api/v1/backups/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /backups | Admin+ | List backup files |
| POST | /backups | Admin+ | Create backup |
| GET | /backups/{filename}/download | License Manage | Download backup file |
| DELETE | /backups/{filename} | License Manage | Delete backup file |

### Sync (`/api/v1/sync/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /sync/status | Admin+ | Queue stats |
| POST | /sync/trigger | Admin+ | Process queue |
| GET | /sync/queue | Admin+ | List queue entries |
| POST | /sync/retry-failed | Admin+ | Reset failed to pending |
| POST | /sync/purge | Admin+ | Delete synced entries older than N days |
| POST | /sync/receive | Peer | Receive sync payload from peer (HMAC auth) |
| GET | /sync/conflicts | Admin+ | List sync conflicts |
| POST | /sync/conflicts/{id}/resolve | Admin+ | Resolve conflict (local_wins / incoming_wins) |

### Archive (`/api/v1/archive/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /archive/status | Admin+ | Job history + table sizes |
| POST | /archive/run | Admin+ | Archive old records (per-table or all) |
| POST | /archive/restore | Admin+ | Restore archived records |

### Sequences (`/api/v1/admin/sequences/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /admin/sequences | Admin+ | List number sequences |
| POST | /admin/sequences/{id}/reset | Admin+ | Reset sequence counter |

### Setup Installer (`/api/v1/installer/`)
First-run setup wizard endpoints (legacy, merged into activate/ path).

### Parent Payments (`/api/v1/parent-payments/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /dashboard | Parent | Payment dashboard: balances, children summary, history |
| GET | /invoices | Parent | All invoices for parent's children |
| POST | /create-session | Parent | Create a payment session |
| POST | /chapa/initialize | Parent | Initialize Chapa payment, returns checkout_url |
| POST | /chapa/webhook | Webhook | Chapa callback handler (async, signature verification) |
| GET | /receipts | Parent | List receipts |
| GET | /receipts/{id}/download | Parent | Download receipt PDF |
| POST | /refund/request | Parent | Request refund |
| POST | /refund/{id}/approve | Finance+ | Approve refund |
| POST | /refund/{id}/process | Finance+ | Process refund |

### Platform Commission (`/api/v1/platform/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /dashboard | Director | Current month's transactions, pending fees |
| GET | /admin/dashboard | Super Admin | Platform revenue overview, school rankings |
| POST | /invoice/{id}/pay | Director | Initialize Chapa payment for invoice |
| POST | /invoice/webhook | Webhook | Chapa webhook: marks invoice paid |
| GET | /reports/daily | Super Admin | Daily revenue report |
| GET | /reports/monthly | Super Admin | Monthly revenue report |
| GET | /reports/schools | Super Admin | Per-school revenue breakdown |

### Corporate (`/api/v1/corporate/`)
Corporate partner management.

### Telegram (`/api/v1/telegram/`)
Telegram bot integration (not yet wired).

### WebAuthn (`/api/v1/webauthn/`)
Passwordless WebAuthn authentication (passkeys).

### Currencies (`/api/v1/currencies/`)
Multi-currency support configuration.

### Metrics (`/api/v1/metrics/`)
Prometheus-format application metrics.

### Conflicts (`/api/v1/conflicts/`)
Sync conflict resolution management.

## Third-party Integration Status

| Integration | Status | Notes |
|-------------|--------|-------|
| Email (SMTP) | Endpoints exist | SMTP config in settings, backend not fully wired |
| SMS Gateway | Toggle exists | No backend implementation |
| Payment Gateway (Chapa) | Wired | Gated behind `FEATURE_CHAPA` flag |
| Telegram Bot | Endpoints exist | Not fully wired |
| WebSocket | Not implemented | 30s polling used instead |

## Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Nightly Archive | 2:00 AM daily | Archive old records per retention policy |
| Database Backup | 3:00 AM daily | Full database backup |
| Daily Fee Calc | 11:30 PM daily | Calculate platform fees for today's payments |
| Monthly Invoice Gen | 1st of month, 1:00 AM | Generate monthly platform invoices |
| License Heartbeat | Every 6 hours | Send server heartbeat to license server |
