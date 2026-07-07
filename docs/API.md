# API Reference

## Overview

REST API at `/api/v1` prefix. 303+ routes across 42 endpoint files. All endpoints return JSON. Authentication via JWT cookies.

## Authentication

All endpoints (except login/register/activate) require a valid `access_token` HttpOnly cookie. Tokens are 30-minute JWT with refresh flow. The Axios interceptor auto-refreshes on 401 responses.

## API Conventions

- **List endpoints**: Support `?page=1&page_size=50` pagination where implemented
- **Create**: POST with JSON body
- **Read**: GET by ID
- **Update**: PATCH (preferred) or PUT for full replacement
- **Delete**: Soft delete (sets `deleted_at`), returns 204
- **School scoping**: All queries filtered by `current_user.school_id`
- **Error format**: `{"detail": "message"}` with appropriate HTTP status

## Endpoints by Module

### Auth (`/api/v1/auth/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | /login | Login with email/password |
| POST | /refresh | Refresh access token |
| POST | /logout | Logout (blacklist token) |
| POST | /password-reset | Request password reset |
| POST | /password-reset/confirm | Confirm password reset |

### Schools (`/api/v1/schools/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List schools (super admin) |
| POST | / | Create school |
| GET | /me | Get current school profile |
| PATCH | /me | Update school profile |

### Students (`/api/v1/students/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List students (paginated, filterable) |
| POST | / | Register student |
| GET | /{id} | Student detail |
| PATCH | /{id} | Update student |
| GET | /{id}/transcript | Cumulative transcript (grades across semesters) |

### Parents (`/api/v1/parents/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List parents |
| POST | / | Create parent |
| POST | /{id}/link | Link parent to student |
| DELETE | /{id}/unlink | Unlink parent from student |

### Teachers / Staff (`/api/v1/teachers/`, `/api/v1/staff/`)
CRUD for teacher and staff profiles. Director-only creation.

### Academic (`/api/v1/academic/`)
Classes, sections, subjects, timetable, exams, exam results, academic years, semesters. Full CRUD per module.

### Attendance (`/api/v1/attendance/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List attendance records |
| POST | /bulk | Mark attendance in bulk |
| GET | /export | Export attendance (CSV/Excel) |

### Finance (`/api/v1/finance/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /accounts | Chart of Accounts |
| POST | /accounts | Create account |
| GET | /journal-entries | Journal entries |
| POST | /journal-entries | Create journal entry |
| GET | /ledger | General Ledger |
| GET | /invoices | Student invoices |
| POST | /invoices | Create invoice |
| GET | /payments | Payment records |
| POST | /payments | Record payment |
| GET | /wallets | Student wallets |
| GET | /budgets | Department budgets |
| GET | /payroll | Payroll runs |
| GET | /reports/* | Financial reports (trial balance, balance sheet, P&L, cash flow) |

### HR (`/api/v1/hr/`)
Contracts, leave management, performance reviews, recruitment, attendance.

### Inventory (`/api/v1/inventory/`)
Categories, items, stock movements, suppliers, purchase orders, assets.

### Library (`/api/v1/library/`)
Books, borrowing, returns, fines, members.

### Cafeteria (`/api/v1/cafeteria/`)
Products, orders (PATCH for updates), wallet payments.

### Dashboard / Analytics (`/api/v1/dashboard/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /stats | Role-specific KPIs |
| GET | /grade-distribution | Grade analytics (aggregate query) |
| GET | /staff-distribution | Staff analytics |

### Reports (`/api/v1/reports/`)
Module-specific report endpoints: system, admin, finance, hr, inventory, library, auditor, cafeteria.

### License (`/api/v1/licenses/`)
CRUD for license keys. Generation, activation, renewal, suspension, revocation.

### Audit (`/api/v1/audit-logs/`)
Query audit trail with filtering.

### Support (`/api/v1/support/tickets`)
Support ticket system.

### Messages (`/api/v1/messages/`)
Internal messaging between users.

### Health (`/api/v1/health/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | DB latency + server identity |
| GET | /live | Liveness probe (always 200) |
| GET | /ready | Readiness probe (200/503) |

### Backup (`/api/v1/backups/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /backups | List backup files |
| POST | /backups | Create backup |
| GET | /backups/{filename}/download | Download backup file |
| DELETE | /backups/{filename} | Delete backup file |

### Sync (`/api/v1/sync/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /sync/status | Queue stats |
| POST | /sync/trigger | Process queue |
| GET | /sync/queue | List queue entries |
| POST | /sync/retry-failed | Reset failed to pending |
| POST | /sync/purge | Delete synced entries older than N days |
| POST | /sync/receive | Receive sync payload from peer (HMAC auth) |
| GET | /sync/conflicts | List sync conflicts |
| POST | /sync/conflicts/{id}/resolve | Resolve conflict (local_wins / incoming_wins) |

### Archive (`/api/v1/archive/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /archive/status | Job history + table sizes |
| POST | /archive/run | Archive old records (per-table or all) |
| POST | /archive/restore | Restore archived records |

### Sequences (`/api/v1/admin/sequences/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/sequences | List number sequences |
| POST | /admin/sequences/{id}/reset | Reset sequence counter |

### Additional Modules
| Module | Prefix | Description |
|--------|--------|-------------|
| QR Codes | `/api/v1/qr/` | Generate / assign QR codes to students |
| NFC Cards | `/api/v1/nfc/` | Assign / manage NFC cards |
| Communication | `/api/v1/communication/` | Announcements, notifications, messages |
| Events | `/api/v1/events/` | School events calendar |
| Telegram | `/api/v1/telegram/` | Telegram bot integration |
| Tags | `/api/v1/tags/` | Student / teacher tags |
| Scanner | `/api/v1/scanner/` | QR/NFC scanner endpoints |
| Settings | `/api/v1/settings/` | School-level settings |
| Report Cards | `/api/v1/report-cards/` | Generate / view report cards |
| Parent Portal | `/api/v1/parent/` | Parent-specific views (payments, children, messages) |
| Student Portal | `/api/v1/student/` | Student-specific views (timetable, grades, attendance) |
| IGA | `/api/v1/iga/` | IGA (Inter-Galactic Auth) integration |
| Installer | `/api/v1/installer/` | First-run setup wizard |

## Third-party Integration Status

| Integration | Status | Notes |
|-------------|--------|-------|
| Email (SMTP) | ❌ Not wired | Toggle exists, no backend |
| SMS Gateway | ❌ Not wired | Toggle exists, no backend |
| Payment Gateway | ❌ Not wired | Manual payments only |
| Telegram Bot | ❌ Not wired | |
| WebSocket | ❌ Not implemented | 30s polling used instead |

## Platform Commission

### Director Dashboard
- `GET /api/v1/platform/dashboard` — Get current month's transactions, pending fees, invoice history for the director's school

### Super Admin Dashboard
- `GET /api/v1/platform/admin/dashboard` — Platform revenue overview: total transactions, pending/invoiced/paid fees, school rankings

### Invoice Payment
- `POST /api/v1/platform/invoice/{invoice_id}/pay` — Initialize Chapa payment for a platform invoice. Returns checkout_url.
- `POST /api/v1/platform/invoice/webhook` — Chapa webhook handler: marks invoice paid on success

### Reports
- `GET /api/v1/platform/reports/daily?date=YYYY-MM-DD` — Daily revenue report
- `GET /api/v1/platform/reports/monthly?month=M&year=Y` — Monthly revenue report  
- `GET /api/v1/platform/reports/schools` — Per-school revenue breakdown

## Parent Payment System

### Dashboard & Invoices
- `GET /api/v1/parent-payments/dashboard` — Parent payment dashboard: outstanding balances, children summary, payment history
- `GET /api/v1/parent-payments/invoices` — All invoices for parent's children

### Payment Session
- `POST /api/v1/parent-payments/create-session?student_id=X&amount=Y&payment_method=chapa&invoice_id=Z` — Create a payment session
- `POST /api/v1/parent-payments/chapa/initialize?session_id=X` — Initialize Chapa payment, returns checkout_url

### Webhook & Verification
- `POST /api/v1/parent-payments/chapa/webhook` — Chapa webhook callback handler (async, verifies signature, processes payment)

### Receipts
- `GET /api/v1/parent-payments/receipts` — List all receipts for parent
- `GET /api/v1/parent-payments/receipts/{receipt_id}/download` — Download receipt as PDF

### Refunds
- `POST /api/v1/parent-payments/refund/request?payment_id=X&amount=Y&reason=Z` — Request refund
- `POST /api/v1/parent-payments/refund/{refund_id}/approve` — Approve refund (finance permission required)
- `POST /api/v1/parent-payments/refund/{refund_id}/process` — Process refund (finance permission required)

## Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Nightly Archive | 2:00 AM daily | Archive old records per retention policy |
| Database Backup | 3:00 AM daily | Full database backup |
| Daily Fee Calc | 11:30 PM daily | Calculate platform fees for today's payments |
| Monthly Invoice Gen | 1st of month, 1:00 AM | Generate monthly platform invoices |
| License Heartbeat | Every 6 hours | Send server heartbeat to license server |
