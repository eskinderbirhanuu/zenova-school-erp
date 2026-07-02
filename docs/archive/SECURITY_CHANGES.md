# Security Changes

## Critical Fixes

### C-01: Unauthenticated User Creation

| Field | Detail |
|-------|--------|
| **Vulnerability** | `/employees/create` endpoint in `activate.py` had no authentication. Anyone could create users with any role (including ADMIN). |
| **Risk Level** | **CRITICAL** — Full account takeover, data breach |
| **Fix** | Added `get_current_user` dependency, set `school_id` from authenticated context |
| **File** | `backend/app/api/v1/endpoints/activate.py` |

### C-02 through C-18: Cross-School Data Leaks (17 endpoints)

| Vulnerability | Risk | Files Fixed |
|--------------|------|-------------|
| Global exam-type access | CRITICAL | academic_service.py |
| Global exam access | CRITICAL | academic_service.py |
| Global exam-result access | CRITICAL | academic_service.py |
| Global fee-structure access | CRITICAL | finance_service.py |
| Global fee-assignment access | CRITICAL | finance_service.py |
| Global scholarship access | CRITICAL | finance_service.py |
| Global contract access | CRITICAL | hr_service.py |
| Global leave-request access | CRITICAL | hr_service.py |
| Global leave-balance access | CRITICAL | hr_service.py |
| Global performance-review access | CRITICAL | hr_service.py |
| Cross-school student read | CRITICAL | students.py, student_service.py |
| Cross-school student update | CRITICAL | students.py, student_service.py |
| Cross-school student delete | CRITICAL | students.py, student_service.py |
| Cross-school student transfer | CRITICAL | students.py, student_service.py |
| Cross-school student promote | CRITICAL | students.py, student_service.py |
| Cross-school promotion on bulk | CRITICAL | academic.py, academic_service.py |
| Export without scope | CRITICAL | academic.py |

**Fix Pattern:** Added `school_id` parameter to all service functions. All queries now filter by `school_id`. All creates set `school_id` on the model.

**Files fixed:** activate.py, students.py, parents.py, nfc.py, qr.py, teachers.py, academic.py, finance.py, hr.py (+ their 8 service files)

## High-Severity Fixes

### H-01 through H-30+: Missing school_id on Create/Update/Delete

30+ endpoints across academic, finance, HR, parent, NFC, QR, and teacher modules were missing school_id on create, update, and delete operations.

**Fix:** Added `school_id` to all create/update/delete service functions.

## Recommendations

1. **Add `require_school_access` middleware** — decorator that checks resource ownership before any operation. Consider implementing in Phase 3.

2. **Add automated tenant isolation tests** — create School A and School B data, then assert School A's user cannot access School B's data. At minimum 5 test cases covering: student, fee, HR, exam, and finance cross-school access.

3. **Rate limit all auth endpoints** — `/employees/create` and similar should have tighter rate limits to prevent brute-force attacks.

4. **Audit WebSocket endpoint** (`ws.py`) — ensure WebSocket connections also enforce school_id.

5. **Consider row-level security (RLS)** in PostgreSQL — database-level enforcement as defense-in-depth.

## What Was NOT Changed

- Password hashing (already bcrypt) — secure
- JWT token expiration (30min access, 7-day refresh) — reasonable
- CSRF protection — already implemented
- Security headers — already implemented
- Rate limiting — already implemented (login, auth)
- Forensic watermarks — already implemented
