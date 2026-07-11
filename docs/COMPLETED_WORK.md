# Completed Work

## 2026-07-01 — Session 1: DeepSeek V4 Flash Implementation (11 Tasks)

### Task-09: Fail-fast on default/weak SECRET_KEY
...

### Task-05: Make log_audit non-committing
...

### Task-02: Patch path traversal in backup endpoints
...

### Task-03: Remove license-key password reset
...

### Task-04: Fix parent-portal payment signature drift
...

### Task-06: Lock rows in cafeteria order
...

### Task-01: Secure /sync/receive endpoint
...

### Task-08: Close IDOR in promote_student + tenant-filter sweep
...

### Task-13: Make require_role honor is_view_only
...

### Task-10: Rate-limit /auth/refresh
...

### Task-12: Harden CSP + CORS regression test
...

---

## 2026-07-01 — Session 2: Phase 2 Hardening (7 Items)

### Login bcrypt fix
- **Files Changed:** `backend/app/core/security.py`
- **Problem:** `pwd_context.verify()` was called with `switchable=True` kwarg, which passlib 1.7.4 doesn't support with bcrypt 3.x. All password verifications silently returned `False`, making every login fail with 401.
- **Solution:** Removed `switchable=True` argument.
- **Impact:** Login now works end-to-end. Verified with `super@zenova.app` / `admin123`.

### Landing page simplified
- **Files Changed:** `frontend/src/app/page.tsx`
- **Problem:** Landing page had activation forms (Main/Branch license tabs) with complex state management, creating parallel activation paths that bypassed server identity creation.
- **Solution:** Removed all activation forms. Fresh server → redirect to `/installer`. Existing server → redirect to `/login`.

### require_role double-wrap fixed
- **Files Changed:** `backend/app/api/v1/endpoints/backup.py`, `backend/app/api/v1/endpoints/activate.py`
- **Problem:** `Depends(require_role(...))` wrapping — `require_role` already returns a `Depends()` object, so double wrapping caused `RuntimeError: Caught unexpected dependency type`.
- **Solution:** Changed `Depends(require_role("ROLE"))` → `require_role("ROLE")`.

### watermark.py Student model mismatch fixed
- **Files Changed:** `backend/app/services/watermark.py`
- **Problem:** Referenced `Student.full_name`, `mother_name`, `grade`, `section`, `stream`, `blood_type`, `is_active` — none exist on Student model (has `first_name`, `middle_name`, `last_name`).
- **Solution:** Replaced with `Student.first_name`, removed non-existent fields, added required `student_id`, `gender`, `date_of_birth`, `admission_date`, `status`.

### 75 DB tables received deleted_at
- **Problem:** Soft-delete filter (`deleted_at.is_(None)`) was silently skipping tables without the column, making the filter a no-op.
- **Solution:** Manually added `deleted_at TIMESTAMP` column to all 75 tables that were missing it (was supposed to be done by migration `9e8f7a6b5c4d3e2f` which was stamped but never run).

### Seed script fixed
- **Files Changed:** `backend/seed_demo.py`
- **Problem:** Section, Subject, TeacherProfile, StaffProfile constructors missing `school_id` argument.
- **Solution:** Added `school_id=school_id` to all four constructors.

### Master_setup_key empty bypass fixed
- **Files Changed:** `backend/app/api/v1/endpoints/installer.py`, `backend/.env.example`
- **Problem:** Empty `MASTER_SETUP_KEY` compared with `"" == ""` → installer always passed (empty key treated as valid).
- **Solution:** Returns 501 if `master_setup_key` is empty.

---

## 2026-07-01 — Session 3: Sync, Trusted Networks, Enqueue

### require_server_role() middleware
- **Files Changed:** `backend/app/core/permissions.py`
- **Problem:** Endpoints needed runtime role checking before DB is initialized.
- **Solution:** New `require_server_role()` dependency that reads role from `server_id.json`.

### sync_secret added to server identity
- **Files Changed:** `backend/app/core/server_identity.py`
- **Solution:** New `generate_sync_secret()` generates `secrets.token_urlsafe(32)`, stored in `server_id.json`.

### Trusted networks + inside-network detection
- **Files Changed:** `backend/app/config.py`, `backend/app/api/v1/deps.py`
- **Problem:** No mechanism to restrict mutations to school network IPs.
- **Solution:** Added `trusted_networks` config (CIDR ranges). Added `_ip_in_networks()` helper + `require_inside_network()` dependency. Sets `current_user.is_view_only = True` when IP is outside range.

### Sync pipeline fixed (send + receive)
- **Files Changed:** `backend/app/services/sync_service.py`, `backend/app/api/v1/endpoints/sync.py`, `backend/app/models/sync_inbound.py`
- **Problem:** `_send_to_vps()` sent unsigned requests; `receive_sync()` returned `{"received": True, "count": 0}` without calling `apply_sync_payload()`.
- **Solution:** `_send_to_vps()` now signs with HMAC headers; `receive_sync()` verifies HMAC and calls `apply_sync_payload()` with dedup via `SyncInbound` table.

### enqueue_sync() wired into CRUD services
- **Files Changed:** `backend/app/services/student_service.py`, `backend/app/services/auth_service.py`, `backend/app/services/finance_service.py`, `backend/app/services/cafeteria_service.py`
- **Solution:** Added `enqueue_sync()` calls after `db.commit()` in: `create_student()`, `bulk_create_students()`, `create_user()`, `create_journal_entry()`, `record_payment()`, `create_order()`, `create_product()`.

---

## 2026-07-01 — Session 4: IDOR Audit, Indexes, Monitoring, Conflict Resolution

### Parent portal IDOR audit
- **Files Changed:** `backend/app/api/v1/endpoints/parent_portal.py`
- **Problem:** `student.full_name` referenced a non-existent attribute (Student model has `first_name`/`last_name`).
- **Solution:** Replaced with `f"{first_name} {middle_name or ''} {last_name}"`. All 4 parent endpoints already properly scope data to linked students.

### Composite indexes (15)
- **Files Changed:** `backend/app/alembic/versions/af43149492e0_add_composite_indexes.py`
- **Solution:** Created indexes on: attendance (school+student, student+date), notifications (user+created), audit_logs (table+record, user+action), payments (school+invoice, school+student), invoices (school+student, school+status), journal_entries (school+date), wallet_transactions (wallet+created), sync_queue (status+created), students (school+status, school+class).

### Missing school_id columns (12 tables)
- **Files Changed:** `backend/app/alembic/versions/af43149492e0_add_composite_indexes.py`
- **Solution:** Added `school_id` to: budget_items, cafeteria_order_items, fee_assignments, fee_structures, goods_receipts, invoice_lines, journal_lines, leave_balances, leave_requests, notifications, payroll_items, semesters.

### Monitoring endpoints
- **Files Changed:** `backend/app/api/v1/endpoints/health.py`
- **Solution:** Enhanced `/health/` with DB latency (ms) and server identity. Added `/health/live` (always 200). Added `/health/ready` (200 if DB reachable, 503 otherwise).

### Sync conflict resolution (LWW + Priority + Conflict Log)
- **Files Changed:** `backend/app/models/sync_queue.py`, `backend/app/models/sync_inbound.py`, `backend/app/models/conflict_log.py`, `backend/app/services/sync_service.py`, `backend/app/alembic/versions/fd71dab89712_sync_priority_version_conflict_log.py`
- **Solution:** Priority queue (attendance=1 → notifications=5). Last-Write-Wins by `updated_at`. `conflict_logs` table records unresolvable conflicts. `sync_inbound` table created (was model-only).

### Student documents + announcements tables
- **Files Changed:** `backend/app/models/student_document.py`, `backend/app/alembic/versions/931f2054f522_create_student_documents_and_.py`
- **Problem:** `student_documents` and `school_announcements` tables existed in models but not in DB (UUID type mismatch with `students.id` VARCHAR).
- **Solution:** Fixed model to use `String(36)` for FK columns. Created migration.

---

## 2026-07-01 — Session 5: Background Worker, IDOR Sweep, Documentation

### Sync background worker
- **Files Changed:** `backend/app/main.py`
- **Solution:** Added daemon thread that runs `process_queue()` every 5 minutes, starting 30s after server boot.

### Sync admin endpoints
- **Files Changed:** `backend/app/api/v1/endpoints/sync.py`
- **Solution:** Added `GET /sync/queue` (list queue entries with status filter), `POST /sync/retry-failed` (reset failed entries to pending).

### Cross-school IDOR sweep — 4 endpoints fixed
- **Files Changed:** `backend/app/api/v1/endpoints/students.py`, `backend/app/api/v1/endpoints/report_cards.py`, `backend/app/api/v1/endpoints/academic.py`
- **HIGH:** `POST /students/{id}/generate-qr` — added `school_id=current_user.school_id` to student lookup
- **HIGH:** `POST /students/{id}/assign-nfc` — same fix
- **MEDIUM:** `POST /report-cards/generate` — added `Semester.school_id == current_user.school_id` filter
- **LOW:** `GET /exam-results/export-excel` — added `Exam.school_id == current_user.school_id` filter

### Alembic chain synchronized
- **Result:** 11 linear migrations, head at `931f2054f522`, DB fully in sync with models.

---

## Verification
- Python import: `import app.main` succeeds (~16s)
- Server startup: uvicorn serves on ports 8003-8011, all endpoints return expected status codes
- Health: `/health/` returns `{"status":"ok"}`, `/health/live` returns 200, `/health/ready` returns 200
- Login: `super@zenova.app` / `admin123` returns 200 with SUPER_ADMIN role
- Alembic: head at `931f2054f522`
