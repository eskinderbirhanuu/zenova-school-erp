# Code Review Findings

Consolidated findings from three reviews: Architectural Review (June 22), Codebase Review Report, and Principal Technical Review (June 27).

## Critical Issues (Must Fix)

### 1. Token Blacklist Called on Creation — `auth.py` (CRITICAL)
`_blacklist_token` is called on every `/login` and `/refresh`, immediately invalidating fresh tokens. **Users cannot complete authentication.**

### 2. Wildcard CORS Overrides Strict Config — `main.py`
Two CORSMiddleware layers: one strict, one wildcard (`"*"`). The wildcard breaks CORS isolation.

### 3. Hard Delete in `academic_service.py`
`db.delete(cls)` on line 76 performs hard delete instead of soft delete. Violates core rule.

### 4. 54+ Models Missing `deleted_at`
Only User, Student, Parent, Branch have soft delete. All other models violate the no-hard-delete rule. See full model list in DATABASE.md.

### 5. Missing Audit Log Parameters
Many finance and academic service calls pass incomplete parameters to `log_audit()` — missing `old_data`, `new_data`, `ip_address`, `user_agent`.

## High Priority Issues

### Security
- No MFA/2FA for financial or super-admin access
- No OAuth/SSO integration
- No rate limiting on refresh endpoint
- No device/IP binding on JWT sessions
- `Role.level` field exists but is never used for enforcement
- No `school_id` / `branch_id` filtering on some endpoints (17 fixes applied, verify coverage)
- No resource ownership checks — any authenticated user can view/edit any record by ID
- PII fields not encrypted or masked in API responses
- CSP allows `'unsafe-eval'`
- No HSTS headers
- No SSL/TLS in production config
- No request size limits on file uploads

### Contradictions Found
| # | Contradiction | Source | Impact |
|---|--------------|--------|--------|
| 1 | SUPER_ADMIN "never logs into school servers" vs `/super-admin/login` exists | Design docs | Architectural confusion |
| 2 | Sidebar nav hardcoded in two places (`sidebar.tsx` AND `config/navigation.ts`) | Frontend | Risk of nav drift |
| 3 | `RoleLayout` vs raw `Sidebar` component | Frontend | UI fragmentation |
| 4 | Frontend declares 13 roles but backend `Role` model has no hierarchy | Cross-stack | Backend allows arbitrary roles |
| 5 | `Finance` vs `FINANCE` role string case via `normalizeUser()` | Frontend | Data quality risk |
| 6 | Payroll endpoints in `finance.py` (HR and Finance both claim payroll) | Backend | Domain boundary violation |
| 7 | `is_setup_complete` in School model vs `/setup/status` recomputation | Backend | Split truth |
| 8 | `Student.status` vs `User.is_active` — inactive students may still have portal access | Backend | Auth bypass |
| 9 | `Wallet.balance` stored as column but computable from transactions | Backend | Balance drift risk |
| 10 | `Invoice.paid_amount` not auto-synced with payments | Backend | Inconsistent paid status |

## Fixes Applied (June 29-30)

| ID | Fix | Files |
|----|-----|-------|
| H1/C1 | Grade computation extracted to shared utility, removed duplicates | `app/utils/grading.py`, `report_cards.py`, `students.py` |
| C3 | Student document endpoints filter by `school_id` | `students.py` |
| F5 | Teacher results page API call corrected | `teacher/results/page.tsx` |
| F6 | Admin student detail page with transcript link | `admin/students/[studentId]/page.tsx` |
| H4 | Pagination added to library/fines, library/members, announcements, assignments | Multiple frontend files |
| M1 | Cafeteria PUT → PATCH consistency | `cafeteria.py` |
| L1 | Magic numbers moved from auth.py to settings.py | `auth.py`, `config.py` |
| M3 | Removed unused `from sqlalchemy import func` from attendance.py | `attendance.py` |
| F3 | Removed dead CSRF frontend code | `api.ts` |
| C1 | Analytics grade_distribution N+1 → single aggregate query | `dashboard.py` |
| F9 | Parent unlink DELETE body → query params | Frontend |
| M6 | `create_scholarship` school_id bug (was using `current_user.id`) | Backend |
| Finance | 7 security fixes: audit params, auto-post GL, idempotency, concurrency lock, wallet GL, over-payment block, period locking | Finance endpoints |

## Missing Business Rules

- **Academic**: No promotion prerequisites, class capacity enforcement, teacher workload limits, exam scheduling conflict detection
- **Financial**: No double-entry DB constraint, payment overage prevention, budget overage alerts, scholarship+fee combination rules
- **HR**: No contract overlap prevention, leave balance negative prevention, attendance mark authorization
- **Library**: No borrowing limit, no overdue fine auto-accrual, no return-date validation

## Missing Database Relationships

- `User` ↔ `Student` backref missing
- `User` ↔ `TeacherProfile` backref missing
- `Student` ↔ `Wallet` backref missing
- `Invoice` ↔ `Payment` no explicit FK
- `Exam` ↔ `ExamResult` backref missing
- `parent_student_link` lacks unique constraint (duplicate links possible)
- `teacher_subject` junction table not imported in `__init__.py`
- `fee_assignment` lacks term/semester link
