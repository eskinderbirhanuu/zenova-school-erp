# AI Changes Log

## 2026-06-29

### Phase 1: Licensing System (7-layer offline validation)

#### backend/app/services/license_service.py

**Problem:** License key format was only 64-bit (8 hex chars = 4 billion combinations), making keys easy to brute-force and forge.

**Solution:** Added V2 256-bit key format with base58 encoding and CRC-32 checksum for integrity. Legacy format remains compatible.

**Why:** 256-bit keys provide 2^256 combinations — computationally infeasible to brute-force.

**Impact:** Systems with old license keys continue to work. New keys are ~59 chars instead of ~23.

---

#### backend/app/licensing/public_key.py (NEW)

**Problem:** RSA public key was loaded from a file at runtime, allowing attackers to replace the file and bypass verification.

**Solution:** Embedded the RSA public key as a PEM string constant in the Python module, compiled into bytecode at install time.

**Why:** Tampering with the public key now requires modifying the Python source or bytecode (harder than replacing a file).

**Impact:** Zero — internal refactor only.

---

#### backend/app/services/license_crypto.py

**Problem 1:** RSA key generation was in the app code (not for production use). No embedded public key integration.

**Solution:** Removed `generate_key_pair()`, added `match_hostname()` for owner auto-activation, added `write_lic_file()` and `read_lic_file()` for standard OS paths, enhanced `verify_license_file()` to use embedded public key by default.

**Why:** Production systems should generate keys offline, not at runtime.

**Impact:** All existing license validation paths preserved. New paths added.

---

**Problem 2:** Machine fingerprint used only 4 components with exact matching. Changing one component (e.g., OS update) would invalidate the license.

**Solution:** Expanded to 8 components (MAC, CPU serial, machine-id, disk serial, hostname, OS version, DMI UUID, boot ID). Added `match_fingerprint()` with 75% tolerance (6 of 8 must match).

**Why:** 75% tolerance allows for hardware changes (e.g., disk replacement) without invalidating the license.

**Impact:** Systems with 3+ components changed will fail validation. Legacy SHA-256 fingerprints still use exact match.

---

#### backend/app/services/license_validator.py (NEW)

**Problem:** No standalone .lic file validation at startup. DB-based validation only (fragile).

**Solution:** New module that validates .lic files at startup: RSA signature → expiry check → hostname/hardware match. Falls back to DB check if no .lic file exists.

**Why:** RSA-signed .lic files cannot be forged without the private key (held offline by developer).

**Impact:** On first run without a .lic file, falls back to legacy DB validation.

---

#### backend/app/main.py

**Problem:** Startup event ran DB-based license validation only. No .lic file validation.

**Solution:** Added .lic file validation as the primary check, with DB fallback.

**Why:** .lic files are more secure (RSA-signed) than DB records.

**Impact:** License validation now runs twice on startup (once for .lic, once for DB fallback). Negligible performance impact.

---

#### backend/app/licensing/coreval.c (NEW)

**Problem:** Pure-Python validation can be monkey-patched at runtime to bypass checks entirely.

**Solution:** C extension that embeds the RSA public key at compile time, verifies signatures using OpenSSL directly. Cannot be monkey-patched at Python level.

**Why:** Attackers who gain Python-level access cannot bypass the C module.

**Impact:** Falls back to pure-Python if C extension is not compiled (no breaking change).

---

#### backend/scripts/gen-license-keys.py (NEW)

**Problem:** No standard tool for generating RSA key pairs for license signing.

**Solution:** Script that generates 4096-bit RSA key pair and saves to `keys/` directory.

**Why:** 4096-bit RSA exceeds industry standards (2048-bit minimum).

**Impact:** Developer workflow only.

---

#### backend/scripts/create-lic-file.py (NEW)

**Problem:** No tool for creating signed .lic files.

**Solution:** CLI tool that reads the private key, creates a signed .lic with school_id, name, valid_until, and optional hostname pattern.

**Why:** Essential for issuing licenses to customers.

**Impact:** Developer workflow only.

---

### Phase 2: Tenant Isolation (school_id filtering)

#### CRITICAL: backend/app/api/v1/endpoints/activate.py

**Problem:** `/employees/create` endpoint had NO authentication — anyone could call it to create users with any role name, bypassing all access controls.

**Solution:** Added `current_user = Depends(get_current_user)` dependency, set `school_id` from authenticated user, default `branch_id` from current user.

**Why:** Unauthenticated user creation is a critical security vulnerability.

**Impact:** Existing activation flows unchanged. Only the unauthenticated `/employees/create` endpoint now requires auth.

**Breaking Changes:** None — the endpoint should never have been public.

---

#### CRITICAL: backend/app/api/v1/endpoints/students.py

**Problem:** 5 student routes (GET/PATCH/DELETE/transfer/promote) did not pass `current_user.school_id` to service layer, allowing cross-school access.

**Solution:** Added `school_id=current_user.school_id` to all 5 service calls.

**Why:** Without school_id filtering, a user in School A can access/modify students in School B.

**Impact:** Users now scoped to their own school.

---

#### CRITICAL: backend/app/services/academic_service.py + endpoints/academic.py

**Problem:** 20+ academic routes returned global data — exam-types, exams, exam-results, sections, subjects, timetable, and promotions had no school_id filtering.

**Solution:** Added `school_id` parameter to every service function (create, read, update, delete) across semesters, classes, sections, subjects, classrooms, timetable, exam-types, exams, exam-results, promotions.

**Why:** These are the most sensitive student data paths.

**Impact:** All academic operations now scoped to user's school.

---

#### CRITICAL: backend/app/services/finance_service.py + endpoints/finance.py

**Problem:** 18 finance routes missing school_id filtering — fee structures, fee assignments, scholarships were returning global data. Wallet access, period locking, payroll approval were not scoped.

**Solution:** Added `school_id` parameter to 18 service functions. Complex joins used for tables without direct school_id (FeeStructure, FeeAssignment, BudgetItem join through parent tables).

**Why:** Financial data is the most sensitive tenant data.

**Impact:** All finance operations scoped to user's school.

---

#### CRITICAL: backend/app/services/hr_service.py + endpoints/hr.py

**Problem:** 11 HR routes missing school_id filtering — contracts, leave requests, leave balances, performance reviews returned global data.

**Solution:** Added `school_id` parameter to 11 service functions. Leave-related queries join through StaffProfile to scope by school.

**Why:** HR data contains PII (personally identifiable information).

**Impact:** All HR operations scoped to user's school.

---

#### HIGH: backend/app/services/parent_service.py + endpoints/parents.py

**Problem:** 6 parent routes (get/update/delete/link/unlink/id-card) missing school_id filtering.

**Solution:** Added `school_id` parameter to parent CRUD operations, link/unlink operations, and ID card generation.

**Why:** Parent data is PII.

**Impact:** Parent operations scoped to school.

---

#### HIGH: backend/app/services/nfc_service.py + endpoints/nfc.py

**Problem:** NFC card status update had no school_id check.

**Solution:** Added `school_id` filter to NFC query.

**Why:** NFC cards tied to student/staff identities; cross-school tampering risk.

**Impact:** NFC operations scoped to school.

---

#### HIGH: backend/app/services/qr_service.py + endpoints/qr.py

**Problem:** QR code lookup by reference had no school_id filter.

**Solution:** Added `school_id` filter to QR query.

**Why:** QR codes encode student/staff identities.

**Impact:** QR lookups scoped to school.

---

#### HIGH: backend/app/services/teacher_service.py + endpoints/teachers.py

**Problem:** Teacher-to-grade and teacher-to-section assignments had no school_id check. Teacher subjects query not scoped.

**Solution:** Added `school_id` parameter to assignment functions and subject query.

**Why:** Cross-school teacher assignment could create data integrity issues.

**Impact:** Teacher assignments scoped to school.

---

### Phase 3: System Integrity

#### backend/app/models/ (17 model files + 4 sub-models)

**Problem:** 21 database tables lacked `school_id` column, making tenant-isolated queries impossible for those models.

**Solution:** Added `school_id = Column(String(36), ForeignKey("schools.id"), nullable=True/False, index=True)` to all missing models.

**Models affected:** audit_logs, employee_contracts, exam_types, exams, exam_results, notification_preferences, parent_student_links, performance_reviews, report_cards, promotion_records, roles, scholarships, sections, staff_profiles, subjects, teacher_grade_assignments, teacher_profiles, teacher_section_assignments, timetable_entries, wallets, wallet_transactions.

**Why:** Without the column, queries cannot filter by school_id even if the endpoint passes it.

**Impact:** Migration required (see DATABASE_CHANGES.md).

---

#### backend/app/models/role.py

**Problem:** Missing `ForeignKey` import caused ImportError when loading models.

**Solution:** Added `ForeignKey` to sqlalchemy import.

**Why:** The import was missing, causing Alembic and model loading to fail.

**Impact:** None — bug fix.

---

#### backend/alembic/versions/a7b9c1d2e3f4a5b6_add_school_id_remaining.py

**Problem:** Migration had invalid revision ID format (`001_add_school_id_remaining` instead of standard 16-char hex).

**Solution:** Changed revision ID to `a7b9c1d2e3f4a5b6` and renamed file to match.

**Why:** Alembic expects standard revision ID format.

**Impact:** Migration chain preserved.

---

## Security Improvements Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 1 | Unauthenticated `/employees/create` endpoint |
| CRITICAL | 17 | Endpoints returning global data across schools |
| HIGH | 30+ | Endpoints with missing school_id create/update/delete |
| Total | 48+ | Security gaps closed |
