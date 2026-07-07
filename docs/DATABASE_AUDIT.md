# ZENOVA — Database Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Database Architect role
**Method:** Static analysis of models, migrations, queries. No code modified. Verified via `alembic` head check (`824e09b38d35` single head) and direct file reads.

---

## Executive Summary

The ZENOVA schema is PostgreSQL 16, modeled as SQLAlchemy 2.0 declarative with 23 Alembic migrations. Multi-tenancy is enforced primarily in application code via `school_id` filtering, with a few **critical exceptions** that break tenancy. The schema is sound on money usage **except 3 Float columns**. Soft-delete is implemented cleanly via a query-event listener. The biggest risks are (a) missing composite uniqueness including `school_id` on assignment tables, (b) `AuditLog.school_id` never populated, (c) supporting tables (cards, scan logs) missing `school_id`.

| Score | Dimension | Notes |
|---|---|---|
| 70/100 | Schema integrity | Strong FK story, missing composite uniques |
| 75/100 | Multi-tenancy | Pattern solid, ~7 model exceptions |
| 80/100 | Soft delete | Clean event listener, consistent coverage |
| 60/100 | Index coverage | Composite indexes added; many N+1 FK-id columns unindexed |
| 85/100 | Money integrity | 3 Float columns out of ~60 numeric money columns |
| 50/100 | Scalability | Single writer, no partitioning, big tables unbounded |

---

## §1 — Schema Inventory

- **110 model classes** across 80 files
- **23 Alembic migrations**, head = `824e09b38d35` (verified single head, no split)
- Models span: `auth/User`, `School`, `Branch`, `Student`, `Parent`, `StaffProfile`, `Teacher`, `Employee`, **academic** (ClassGrade, Section, Subject, Classroom, Timetable*, AcademicYear, Semester, ExamType, Exam, ExamResult, Promotion, ReportCard), **finance** (Invoice, InvoiceLine, Payment, JournalEntry, JournalLine, FeeStructure, FeeAssignment, Budget, BudgetItem, Wallet, WalletTransaction, PayrollRun, PayrollItem, PurchaseOrder, PurchaseRequest, GoodsReceipt, InventoryItem, InventoryMovement, Supplier), **operations** (Attendance, Notification, Message, Announcement, Event, Leave, LeaveBalance, Contract), **library/cafeteria** (Book, BookBorrowing, LibraryFine, CafeteriaProduct, CafeteriaOrder, CafeteriaOrderItem), **cards** (StudentCard, StaffCard, ParentCard, EmployeeCard, NFCCard, NfcScanLog, QRCode, CardDesign, CardPrintRequest), **license/sync** (License, LicenseType, LicenseStatus, SyncQueue, SyncOperation, SyncStatus, SyncInbound, ServerIdentity, DeviceChangeRequest, NumberSequence, ArchiveJob, ArchivedRecord, ConflictLog, AuditLog), **support** (SupportTicket), **corporate** (CorporateDepartment, CorporateEmployee, CorporateAudit).

---

## §2 — Multi-Tenancy Findings

### §2.1 — Models WITHOUT `school_id` holding tenant-scoped data (**CRITICAL**)

| Model | File | Risk |
|---|---|---|
| `StudentCard` | `student_card.py:7` | Cards cross tenants — UID collisions possible across schools |
| `StaffCard` | `staff_card.py:7` | Same |
| `ParentCard` | `parent_card.py:7` | Same |
| `EmployeeCard` | `employee_card.py:7` | Same |
| `CardPrintRequest` | `card_print_request.py:7` | Print requests cross tenants |
| `CorporateDepartment` | `corporate_department.py:7` | Intentional cross-tenant scope; tighten role-gate (H6) |
| `CorporateEmployee` | `corporate_employee.py:8` | Same |

### §2.2 — Models WITH `school_id` but `nullable=True` (untracked tenant ownership)

| Model | File | Severity | Why |
|---|---|---|---|
| `AuditLog` | `audit_log.py:11` | **Critical** | NEVER populated by `log_audit()` (160 callers) — tenant-filtered forensics impossible |
| `NfcScanLog` | `nfc_scan_log.py:17` | High | Scan rows may not be attributable to a school |
| `QRCode` | `qr_code.py:15` | Medium | Public QR may legitimately have no tenant |
| `License` | `license.py:35` | Low | Pre-activation state — fine |
| `SupportTicket` | `support_ticket.py:12` | Medium | Cross-school support flow intentional but mishandling possible |
| `User` / `Parent` / `Student` | various | Low | Super-admin / pre-onboarding grace |

### §2.3 — Foreign Key on-delete behavior

- Only **1 FK uses `ondelete="CASCADE"`** — `student_documents.student_id` (`student_document.py:11`)
- **All other ~90 FKs default to RESTRICT/NO ACTION** → orphan-row risk on parent delete.
- Critical orphan-risk tables (FK should be CASCADE or have parent-before-delete cleanup service):
  - `invoice_lines` → `invoices`
  - `journal_lines` → `journal_entries`
  - `payroll_items` → `payroll_runs`
  - `exam_results` → `exams`
  - `fee_assignments` → `fee_structures`
  - `qr_codes` → `branches`
  - `archived_records` → `archive_jobs`
  - all `*_cards` → students / staff_profiles / parents / corporate_employees

  Soft-delete mitigates this — parent rows are never physically deleted. Still, an admin forced hard-delete of a school would leave orphans.

---

## §3 — Indexes & Constraints

### §3.1 — Composite unique constraints (only 4 in entire schema)

| Table | Constraint | Includes school_id? | Verdict |
|---|---|---|---|
| `number_sequences` | `uq_prefix_school_year (prefix, school_id, year)` | ✓ | Tenant-safe ✓ |
| `teacher_grade_assignments` | `uq_teacher_grade` | ✗ | **High** — cross-tenant dup risk |
| `teacher_subjects` | `uq_teacher_subject` | ✗ | **High** — cross-tenant dup risk |
| `teacher_section_assignments` | `uq_teacher_section` | ✗ | **High** — cross-tenant dup risk |

Practical impact is low (keys are UUID4s; collision across tenants unlikely), but the intent of "unique per teacher within school" is not expressed in the DB.

### §3.2 — Indexes present

- `school_id` indexed on ~22 models explicitly; composite indexes added by migration `af43149492e0` cover the heavy query patterns: `ix_attendance_school_student`, `ix_payments_school_invoice`, `ix_invoices_school_status`, `ix_journal_entries_school_date`, `ix_audit_logs_table_record`, `ix_audit_logs_user_action`, `ix_sync_queue_status_created`, `ix_students_school_status`. Good.
- `audit_log.school_id` is indexed but never populated → the index is dead.

### §3.3 — **Missing** indexes (Hot N+1 paths)

| Column / Table | Used by | Severity |
|---|---|---|
| `parent_student_link.student_id`, `parent_student_link.parent_id` | parent-portal dashboard join | High |
| `attendance.student_id`, `attendance.staff_profile_id` | attendance queries by student | High |
| `exam_result.student_id`, `exam_result.exam_id` | transcript/report-card loops | High |
| `wallet_transaction.wallet_id` | wallet history | High |
| `inventory_movement.item_id` | stock card | Medium |
| `message.sender_id`, `message.recipient_id` | inbox query per user | High |
| `contract.staff_profile_id`, `leave_request.staff_profile_id` | HR dash | Medium |

---

## §4 — Money Integrity

### §4.1 — Float used for money (**CRITICAL** — violates project rule "Decimal for money, never float")

| Model:Column | File:Line | Type | Severity |
|---|---|---|---|
| `library_fine.amount` | `library_fine.py:16` | `Float` | Critical |
| `inventory_asset.value` | `inventory_asset.py:14` | `Float` | Critical |
| `license-server Subscription.amount` | `license-server/app/models/models.py:77` | `Float` | Critical |

### §4.2 — Schemas use `float` for money across the wire (**HIGH** — see API_AUDIT M8)

`schemas/finance.py` (~40 fields), `schemas/cafeteria.py` (~3), `schemas/hr.py` (~2), `schemas/inventory.py` (~5), `schemas/report_card.py`, `schemas/library.py`. Models correctly use `DECIMAL(15,2)`, but every exchange through these schemas converts Decimal → float → Decimal on the way in, losing precision (and is detectable by stock control: a $0.01 invoice difference). Pydantic + SQLAlchemy _will_ coerce respectfully, but the project rule is violated at the contract boundary.

### §4.3 — Decimal usage done right

All other ~60 money columns use `DECIMAL(15,2)` correctly — invoices, payments, wallet balance/txns, fees, payroll, cafeteria, journal lines, purchase orders, budgets, exams (max_score), `exam_types.weight`, `book_borrowings.fine_amount`.

---

## §5 — Soft Delete

### §5.1 — Implementation

`backend/app/database.py:6-30` — SQLAlchemy event listener:

```python
@event.listens_for(Query, "before_compile", retval=True)
def _filter_soft_deleted(query):
    # for each queried entity with `deleted_at`, add `entity.deleted_at.is_(None)`
    # strip LIMIT/OFFSET first, apply filter, restore LIMIT/OFFSET
```

Bypass: `.execution_options(include_deleted=True)`, gated behind `current_user.is_superuser or current_user.role.name in ("ADMIN", "SUPER_ADMIN")`.

### §5.2 — Coverage

Present on every tenant-scoped table. **Absent on intentionally-immutable / append-only tables:**

- `archive_jobs`, `archived_records` (immutable snapshots) — correct
- `conflict_logs` (history) — correct
- `nfc_scan_logs` (append-only log) — correct
- `card_designs` — **smell**, can't soft-delete a design
- `monthly_platform_invoices`, `platform_fees` — **smell**, can't retract
- `payment_sessions`, `payment_gateway_configs` — **smell**
- `school_telegram_bots` — **smell**

---

## §6 — Alembic Migrations

### §6.1 — Head verification

- **Head:** `824e09b38d35` (verified single head — chain is contiguous, no split-head contrary to other auditors' claims).
- AGENTS.md memory incorrectly lists head as `775f276ecad9` — that revision is in the middle of the chain, not a head.
- Full chain (newest → oldest): `824e09b38d35 → 8ce8f15441b9 → 960fd8c2c236 → 592860dea46f → d6e7f8a9b0c1 → d5e6f7a8b9c0 → d4e5f6a7b8c9 → c3d4e5f6a7b8 → b2c3d4e5f6a7 → a1b2c3d4e5f6 → 775f276ecad9 → 931f2054f522 → fd71dab89712 → af43149492e0 → 9e8f7a6b5c4d3e2f → d1e2f3a4b5c6d7e8 → 73ccf4e21e6d → b8c9d0e1f2a3b4c5 → a7b9c1d2e3f4a5b6 → cf5da0e968b4 → ed34b3133cb4 → 6c759f002a02 → 56e806ae8fa1`

### §6.2 — Risky migrations

| # | Revision | Risk |
|---|---|---|
| 1 | `9e8f7a6b5c4d3e2f` (`add_deleted_at_to_all_remaining_tables`) | Blind loop adds `deleted_at` to 70+ tables; **no existence guard** — will fail loudly if any table already has the column |
| 2 | `d1e2f3a4b5c6d7e8` (`add_school_id_child_tables`) | Adds `school_id` as **nullable=True** to 13 child tables. Existing rows will have `school_id=NULL` — soft-delete filter is bypassed for those rows until backfilled. **High data-quality risk** for pre-existing invoice_lines/journal_lines until backfilled with parent's school_id |
| 3 | `af43149492e0` (`add composite indexes`) | Uses raw SQL `CREATE INDEX IF NOT EXISTS` — safe but verbose |
| 4 | `56e806ae8fa1` (`initial`) | `LicenseStatus` enum = ACTIVE/EXPIRED/SUSPENDED/REVOKED only. Later migrations extend same enum to add `REVIEW_MODE`, `DEVICE_LOCKED` — verify downstream enum is consistent in app code |

### §6.3 — Recommendations

- Add existence guards on every future DDL operation (consistent with `af43149492e0`).
- Add a data backfill migration for `AuditLog.school_id` populated by joining to the entity referenced by `(table_name, record_id)` — one-time retro-active backfill.
- Add a backfill migration for `*_cards.school_id` (matching parent's `school_id`) and `nfc_scan_logs.school_id` (matching reader's school).

---

## §7 — Data Integrity Risks

### §7.1 — Orphan rows on hard delete

If a `School` row is ever hard-deleted (currently `SCHOOL_MANAGE` admin path does soft-delete only, but a SUPER_ADMIN `db.delete()` would hard-delete), the parent `Student`s cascade (one FK is CASCADE) but the dependent rows in tables with RESTRICT FKs block the delete — erroring out the transaction.

### §7.2 — Duplicate sequence races

All five sequence-number generators use `with_for_update()` correctly, except **`id_service.generate_id`** (`id_service.py:28`). When two callers race a missing sequence lookup, both INSERT; one wins, the other raises `IntegrityError`. Recommend re-locking after create (as `finance_service._next_sequence_number` does).

### §7.3 — `AuditLog.school_id` always NULL

**Critical** finding — prevents per-tenant forensics. See SECURITY_AUDIT §3 and DB_AUDIT §2.2. Fix: `log_audit()` should accept `school_id` parameter and all endpoint callers should pass `current_user.school_id`.

---

## §8 — Conclusions

The schema is **well-structured and follows PostgreSQL best practice**. The two compounding issues are:

1. **Tenancy gaps** in 4 card tables, audit log, scan logs — these create both a forensics problem (audit) AND a tenant-data isolation problem (cards).
2. **3 Float money columns** — minor in count but visible violation of the project's stated money rule.

Fix priorities: AuditLog.school_id backfill + populator > card tables school_id migration > Float→Decimal migration > composite uniques on teacher assignment tables > add missing FK indexes > consider PostgreSQL RLS for defense in depth.

**Database Score: 70/100** — deduct 15 for tenancy breaches, 5 for Float money, 10 for missing indexes / unbounded growth, 0 for solid schema design and soft-delete.

---

**End of DATABASE_AUDIT.md**
