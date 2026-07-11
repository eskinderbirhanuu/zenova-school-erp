# 04 — DATABASE AUDIT

**Generated:** 2026-07-11
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

The ZENOVA database schema comprises 77 SQLAlchemy models backed by PostgreSQL 16, managed through 26 Alembic migrations forming a single linear chain. Tenant isolation is enforced via `school_id` columns with application-level filtering. Soft-delete is universal via a `Query.before_compile` event listener. The schema is mature with DECIMAL(15,2) for all money fields (except 2 Float outliers), composite indexes for performance, and with_for_update() row locking for race conditions. Two remaining data-model gaps exist: NFC card tables lack school_id, and 2 Float columns remain.

**Score:** 7.5/10

---

## Current Implementation

### ER Design Overview

**77 models** across 79 files, organized by domain:

| Domain | Models | Key Entities |
|--------|--------|--------------|
| Identity/Auth | User, Role, Server, ServerIdentity | RBAC + deployment identity |
| Tenant | School, Branch, SchoolSettings, CardDesign | Multi-tenant core |
| License | License, DeviceChangeRequest | HW-bound licensing |
| Academic | AcademicYear, Semester, ClassGrade, Section, Subject, Classroom, TimetableEntry, ExamType, Exam, ExamResult, ReportCard, PromotionRecord, Assignment, TeacherGradeAssignment, TeacherSectionAssignment, TeacherProfile, TeacherSubject | Full academic hierarchy |
| Student/Parent | Student, Parent, ParentStudentLink, StudentDocument | Core enrollment |
| NFC/QR | StudentCard, StaffCard, ParentCard, EmployeeCard, NFCCard, NfcScanLog, CardPrintRequest, QRCode | Card + identity tokens |
| Finance | Account, JournalEntry, JournalLine, FeeType, FeeStructure, FeeAssignment, Invoice, InvoiceLine, Payment, Receipt, ReceiptLine, PaymentSession, Refund, Wallet, WalletTransaction, Scholarship, AccountingPeriod, NumberSequence, SchoolTransaction, PlatformFee, MonthlyPlatformInvoice, PaymentGatewayConfig | Full double-entry GL |
| HR | EmployeeContract, LeaveType, LeaveRequest, LeaveBalance, Attendance, PerformanceReview, Recruitment, PayrollRun, PayrollItem | HR lifecycle |
| Inventory | InventoryCategory, InventoryItem, StockMovement, Supplier, InventoryAsset, PurchaseRequest, PurchaseOrder, GoodsReceipt, Budget, BudgetItem | Inventory + procurement |
| Library | BookCategory, Book, BookBorrowing, LibraryMember, LibraryFine | Library circulation |
| Cafeteria | CafeteriaProduct, CafeteriaOrder, CafeteriaOrderItem | POS |
| Communication | Announcement, Notification, Message, NotificationPreference, SchoolTelegramBot, Event | Messaging |
| Sync | SyncQueue, SyncInbound, ConflictLog | Multi-server sync |
| Archive | ArchiveJob, ArchivedRecord | Data archiving |
| Corporate | CorporateDepartment, CorporateEmployee | Cross-school corporate |
| Misc | SupportTicket, Report, AuditLog, NfcScanLog | Support/reporting/audit |

### Column Data Types

- **Money fields**: `DECIMAL(15, 2)` — consistent across invoices, payments, receipts, refunds, wallets, journals, scholarships, fees, payroll, budgets, platform fees, school transactions
- **EXCEPTIONS**: `library_fine.amount` (Float), `inventory_asset.value` (Float) — 2 Float outliers
- **IDs**: String(36) UUIDs as PKs universally
- **Timestamps**: DateTime with UTC timezone defaults
- **Soft-delete**: `deleted_at` (DateTime, nullable) on all 77 models

### Multi-Tenant Isolation

| Status | Models |
|--------|--------|
| Has school_id Column | User, Student, Parent, TeacherProfile, StaffProfile, Account, JournalEntry, JournalLine, FeeType, FeeStructure, FeeAssignment, Invoice, InvoiceLine, Payment, Receipt, Wallet, WalletTransaction, Scholarship, Period, PayrollRun, Budget, SchoolTransaction, PlatformFee, MonthlyPlatformInvoice, QRCode, CardPrintRequest, SchoolSettings, NotificationPreference, CafeteriaProduct, BookCategory, Book, InventoryAsset, StudentDocument, SchoolTelegramBot, ArchivedRecord, sync_queue, ... (most models) |
| Intentionally No school_id | CorporateDepartment, CorporateEmployee (global corporate), SyncInbound (cross-server audit), ArchiveJob (cross-tenant job tracking) |
| **MISSING school_id** | **StudentCard, StaffCard, ParentCard, EmployeeCard** — CRITICAL GAP |

### Foreign Keys & Cascade

- **Only 1 FK uses `ondelete=CASCADE`**: `student_documents.student_id` → `students.id`
- **ALL other FKs default to RESTRICT** (SQLAlchemy default): No cascade deletes. Orphan risk: deleting a parent doesn't clean up child records — orphan rows must be soft-deleted separately.
- This is intentional (soft-delete philosophy) but creates maintenance burden.

### Indexes

- **Standard indexes**: UUID PKs auto-indexed. `unique=True` columns auto-indexed (email, employee_id, license key, etc.)
- **Composite indexes** added by `af43149492e0`: attendance (student_id+date), payments (school_id+payment_date), invoices (school_id+status), audit_logs (table_name+record_id), sync_queue (status+priority), students (school_id+status), wallet (school_id+student_id)
- **Missing indexes**: Most tables do NOT have a standalone index on `school_id` alone — only composite indexes include it. This is acceptable for filtered queries but suboptimal for admin-wide scans.

### Unique Constraints

4 composite unique constraints:
- `teacher_grade_assignments`: (teacher_profile_id, class_grade_id) — prevents duplicate grade assignments
- `teacher_section_assignments`: (teacher_profile_id, section_id, academic_year_id) — prevents duplicate section assignments
- `teacher_subjects`: (teacher_profile_id, subject_id, class_grade_id) — prevents duplicate subject assignments
- `number_sequences`: (prefix, school_id, year) — ensures per-tenant sequence isolation

### Race Condition Protection

`with_for_update()` row locks used in:
- `NumberSequence` generation (finance, id_service, cafeteria, parent_payment, platform_commission)
- `MonthlyPlatformInvoice` processing (platform_commission.py:124-126)
- Minor gap: `id_service` creates new NumberSequence row, flushes, then re-locks — small race window between add() and second lock.

### Migrations (Alembic)

- **1 head**: `c5d6e7f8a0b1` (single linear chain, no merge points)
- **26 migrations**: Clean sequential chain
- **Chain order** (from base): initial → deleted_at additions (3 migrations) → NFC v2 + corporate → sync → card_designs → hashing → platform commission → composite indexes → server identity → payment gateway → student_documents → archive → school_id children → school_settings → device_change → runtime_env → TPM → idempotency → card_print school_id
- **Previous multi-head issue RESOLVED**: 824e09b38d35 + 775f276ecad9 were merged into the linear chain

### Soft-Delete Implementation

```python
# database.py:6
@event.listens_for(Query, "before_compile", retval=True)
def _filter_soft_deleted(query: Query) -> Query:
    if query._execution_options.get("include_deleted"):
        return query
    # Strips LIMIT/OFFSET, adds deleted_at IS NULL, re-applies LIMIT/OFFSET
```
- Correctly handles LIMIT/OFFSET re-ordering
- Bypass: `.execution_options(include_deleted=True)`
- All 77 models have `deleted_at` column

---

## Strengths

1. **Universal DECIMAL(15,2)**: 98%+ money columns use correct decimal type. No floating-point accounting errors.
2. **Universal soft-delete**: Every table has `deleted_at`. Query-level filter works correctly. Recoverable data.
3. **Clean Alembic history**: Single head, 26 linear migrations. No merge conflicts.
4. **with_for_update() locking**: Sequence generation and payment processing are race-safe.
5. **Composite indexes**: Performance indexes on common query patterns (payments by school+date, invoices by school+status, etc.).
6. **Composite unique constraints**: Teacher assignments are properly deduplicated.
7. **school_id on most models**: 60+ models have proper tenant isolation column.
8. **AuditLog model has school_id column**: Available for tenant-scoped queries (though many callers don't populate it).

---

## Weaknesses

1. **NFC card tables lack school_id**: Student/Staff/Parent/Employee card tables have no tenant column. Cross-tenant collisions at DB level.
2. **2 Float money columns**: `library_fine.amount` and `inventory_asset.value` use Float instead of DECIMAL.
3. **No cascading soft-delete**: Orphan risk — soft-deleting a parent doesn't cascade to children. Requires manual multi-table soft-delete in services.
4. **Missing standalone school_id indexes**: Many tables rely on composite indexes that include school_id + something else. Simple `WHERE school_id = X` scans may miss index coverage.
5. **sync_inbound lacks school_id**: No tenant tracking on received sync payloads (acceptable for sync but loses traceability).
6. **QRCode model stores base64 plaintext in `encrypted_token`**: Field name misrepresents actual security.

---

## Issues

### Critical

| # | Issue | Tables | Detail |
|---|-------|--------|--------|
| C1 | NFC card tables missing school_id | student_cards, staff_cards, parent_cards, employee_cards | No `school_id` column. A card UID hash can exist under different tenants with no DB-level isolation. Cross-tenant collision possible. |

### High

| # | Issue | Tables | Detail |
|---|-------|--------|--------|
| H1 | Float money columns | library_fines.amount, inventory_assets.value | Float type for financial values. Risk of rounding errors. |
| H2 | No cross-table card UID uniqueness | All 4 card tables | Same card_uid hash can be in student_card AND staff_card simultaneously. scan_nfc() picks first match — data integrity issue. |

### Medium

| # | Issue | Detail |
|---|-------|--------|
| M1 | Orphan row risk from soft-delete | No cascade on FKs. Soft-deleting a school/branch/student doesn't cascade to child records. Services must manually handle. |
| M2 | id_service sequence re-lock gap | New NumberSequence row created, flushed, then re-locked. Microsecond race window between add() and second with_for_update(). |
| M3 | Missing standalone school_id indexes | Many large tables (students, invoices, payments) have composite indexes with school_id but no standalone school_id index. Acceptable but suboptimal. |

### Low

| # | Issue | Detail |
|---|-------|--------|
| L1 | QRCode.encrypted_token is plaintext | Base64(JSON), not encrypted. Field name is misleading. |
| L2 | sync_inbound no school_id | Cross-server sync audit — intentionally global, but traceability lost. |
| L3 | Student.school_id nullable | `nullable=True` — some gateways apps may have null school_id, but data integrity suggests it should be required for enrolled students. |

---

## Recommended Improvements

1. **CRITICAL: Migration to add `school_id` to all 4 NFC card tables** — `ALTER TABLE student_cards ADD COLUMN school_id VARCHAR(36) REFERENCES schools(id)`. Backfill from the referenced entity's school_id. Add composite unique on (school_id, card_uid).
2. **HIGH: Float → DECIMAL migration** — `ALTER TABLE library_fines ALTER COLUMN amount TYPE DECIMAL(15,2); ALTER TABLE inventory_assets ALTER COLUMN value TYPE DECIMAL(15,2)`.
3. **HIGH: Cross-table UID uniqueness** — Add application-level check: when assigning a card, scan ALL 4 tables for existing UID hash. Or better: add a unified `nfc_cards` table with `card_type` discriminator and (school_id, card_uid) unique constraint.
4. **MEDIUM: Add standalone school_id indexes** to largest tables for admin queries.
5. **MEDIUM: Close id_service race window** — Use INSERT ... ON CONFLICT or acquire lock BEFORE creating row.
6. **LOW: Migrate student.school_id to `nullable=False`** for data integrity (requires checking existing null rows).

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| Card tables add school_id | Medium — migration + backfill | Low — additive column |
| Float → DECIMAL | Low — ALTER COLUMN | Low |
| Cross-table UID uniqueness | Medium — app logic change | Low |
| Standalone indexes | Low — CREATE INDEX | Low (concurrent creation possible) |

---

## Priority

| Priority | Item |
|----------|------|
| P0 (now) | NFC card tables: add school_id + backfill |
| P1 (soon) | Float money → DECIMAL |
| P1 (soon) | Cross-table card UID uniqueness check |
| P2 (later) | Standalone school_id indexes |
| P3 (later) | id_service race fix, student school_id NOT NULL |

---

## Production Readiness: Database

**Ready with caveats.** The schema is comprehensive, well-normalized, and production-grade for single-tenant use. For multi-tenant production, the NFC card table school_id gap must be closed. The 2 Float columns are low-risk but should be migrated.