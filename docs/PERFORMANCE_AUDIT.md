# ZENOVA — Performance Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Performance Engineer role
**Method:** Static analysis for N+1, COUNT, unbounded queries, sync-in-async, missing indexes. No code modified.

---

## Executive Summary

ZENOVA's list endpoints are largely unbounded, the parent and student portal dashboards are N+1 heavy (4-6 queries × child count), some `dashboard.py` COUNT queries run on every dashboard hit, and FK columns on heavy N+1 paths lack indexes. The monolithic sync worker is thread-based and shares one DB. Asyncio sync/async boundary has a silent broadcast-loss bug. At the target scale (1,000 schools, 1M users), the biggest single concern is the **unpartitioned `attendances` table growing unbounded** — at ~500M rows/yr a single school's 5-picture count will dominate disk.

| Score | Dimension | Notes |
|---|---|---|
| 60/100 | Query patterns | N+1 in 3 dashboards; COUNT cascades |
| 55/100 | Pagination | Inconsistent — academic endpoints unbounded |
| 70/100 | Indexes | Composite indexes added; gaps on FK-id columns |
| 50/100 | Architecture scale | Single writer; single scheduler; thread worker |
| 65/100 | Async correctness | `asyncio.ensure_future` from sync ctx silently fails |
| 60/100 | Caching | Redis for rate limit / sessions only; no app-data cache |

---

## §1 — N+1 Patterns

### §1.1 — Parent Portal Dashboard (HIGH)

`endpoints/parent_portal.py:41–83`

For each `sid` in `student_ids`:
- `db.query(Student).filter(...).first()`
- 3× separate COUNT queries on `Attendance` (absent, late, present)
- `db.query(ClassGrade)` for class info
- joined `ExamResult/Exam/Subject` query
- `db.query(Invoice)` for unpaid

With N children → **~6N queries**. A parent with 5 children → 30+ queries.

**Fix:** Bulk-fetch via `Student.id.in_(student_ids)`, aggregate attendance in one `GROUP BY` query, prefetch via `selectinload`.

### §1.2 — Student Transcript (HIGH)

`endpoints/students.py:264–268`

```python
for pr in promotion_history:
    c = db.query(ClassGrade).filter(ClassGrade.id == pr.to_class_id).first()
```

Per-promotion ClassGrade lookup. A student with 8 years of promotion history → 8 queries.

**Fix:** `class_ids = [pr.to_class_id for pr in promotion_history]; db.query(ClassGrade).filter(ClassGrade.id.in_(class_ids)).all()` + dict lookup.

### §1.3 — Student Portal Dashboard (HIGH)

`endpoints/student_portal.py:93–101`

Inside the timetable loop:
- `db.query(Subject).filter(Subject.id == e.subject_id).first()`
- `db.query(Classroom).filter(...)`

N subjects → 2N queries.

**Fix:** Bulk-fetch subjects and classrooms via `IN` query.

### §1.4 — Marksheet / report_cards.py

`report_cards.py:88–119`, `students.py:294–305`

```python
for r in results:
    exam = next((e for e in exams if e.id == r.exam_id), None)
```

O(E×R), and the same loop duplicated across 3 files.

**Fix:** build `{exam_id: exam}` dict once, then `exam = exams_by_id.get(r.exam_id)`.

### §1.5 — NFC scan_nfc (Medium)

`nfc_v2_service.py:114–119`

4 sequential `db.query(XCard).filter(card_uid==...).first()` — one per card type.

**Fix:** `UNION ALL` or a join table `cards` with `card_type` discriminator.

### §1.6 — Device-change history (Medium)

`licenses.py:238–258`

Loops every School and queries DeviceChangeRequest per-school. ~S+1 queries.

**Fix:** Single query with a JOIN to schools.

---

## §2 — COUNT / `.count()` Patterns

| Location | Pattern | Severity |
|---|---|---|
| `dashboard.py:37–47, 52–82` | 7+ scalar COUNTs per dashboard hit, single-table each | Medium — add Redis cache TTL 60s |
| `audit_logs.py:28` | `q.count()` + `q.offset().limit()` = 2 queries | Low — acceptable |
| `communication.py:50` | `q.count()` + `q.all()` = 2 queries | Low |
| `corporate_service.py:178–184` | 3 COUNTs for dashboard | Low |

**Fix for dashboard:** Wrap in Redis cache keyed by `school_id:period`; refresh every 60s or on relevant-write event.

---

## §3 — Pagination (Inconsistency)

### §3.1 — Unbounded list endpoints (return full filtered set)

| Endpoint | File:Line |
|---|---|
| `/academic-years`, `/semesters`, `/classes`, `/sections`, `/subjects`, `/classrooms`, `/timetable*/`, `/exam-types`, `/exams`, `/exam-results`, `/promotions` | `academic.py:32,53,64,86,108,130,163,169,203,219,239,316` |
| `/corporate/departments` | `corporate.py:17` |
| `/report_cards` | `report_cards.py:20` |
| `/teachers/*` (some) | `teachers.py:104,200,230` |
| `/parents/search` | `parents.py:43` — no `.limit()` |
| Excel exports: `/attendance/export`, `/payments/export-excel`, `/invoices/export-excel`, `/students/export-excel` | load entire unbounded set into memory → OOM risk on 1GB containers |

### §3.2 — Bounded correctly

- `/announcements` capped at `limit(50)` ✓
- `/corporate/employees` capped at `le=500` ✓
- `/nfc/print-requests`, `/nfc/scan-logs` default `limit=100` ✓
- `/qr/history/all` default `limit=100` ✓

### §3.3 — Recommendation

Enforce `?skip=&limit=` (max 1000) on every list endpoint via a `PaginationDep` shared dependency. Excel exporters must use `StreamingResponse` with `openpyxl.write_only=True` and not materialize the full workbook in memory.

---

## §4 — Synchronous I/O in async Endpoints

- 9 `async def` endpoint functions total in the codebase.
- **No** `time.sleep`, `requests.get`, or `urllib` inside `async def` ✓
- BUT: `nfc_v2_service.scan_nfc` (sync) calls `asyncio.ensure_future(...)` from sync ctx (`nfc_v2_service.py:182-193`) → **raises RuntimeError: no running event loop** → silently swallowed by `try/except: pass` → **realtime WebSocket broadcasts silently fail.** (Same bug confirmed in BACKEND_AUDIT §5.)
- `sync_service.py:109` and `backup_service.py:72,86,95` use `urllib.request` (sync) — acceptable inside dedicated sync workers/threads ✓

---

## §5 — Index Coverage

### §5.1 — Indexes present (✓)

- `audit_log`: `school_id`, `table_name`, `record_id`, `action`, `user_id`, `created_at` ✓ (but `school_id` value never set → dead index)
- `archive`: `table_name`, `job_id`, `record_id`, `school_id`, `archived_at` ✓
- `corporate_employee.employee_id` unique ✓
- `*_Card.card_uid` unique ✓
- `device_change_request.license_id`, `school_id` ✓
- Composite indexes (migration `af43149492e0`): `ix_attendance_school_student`, `ix_payments_school_invoice`, `ix_invoices_school_status`, `ix_journal_entries_school_date`, `ix_audit_logs_table_record`, `ix_audit_logs_user_action`, `ix_sync_queue_status_created`, `ix_students_school_status` ✓

### §5.2 — Missing indexes (HIGH)

| Column / Table | Used by |
|---|---|
| `parent_student_link.student_id`, `parent_student_link.parent_id` | parent-portal dashboard join |
| `attendance.student_id`, `attendance.staff_profile_id` | attendance queries |
| `exam_result.student_id`, `exam_result.exam_id` | transcript / report card |
| `wallet_transaction.wallet_id` | wallet history |
| `inventory_movement.item_id` | stock card |
| `message.sender_id`, `message.recipient_id` | inbox query per user |
| `contract.staff_profile_id`, `leave_request.staff_profile_id` | HR dashboard |

**Fix:** Alembic migration adding `index=True` to these FK columns. Expect 2–5× dash improvement on heavy paths.

---

## §6 — Scalability Analysis

### §6.1 — Capacity assumed

| Metric | Capacity | Limit | Reason |
|---|---|---|---|
| Concurrent requests | ~500 req/s | Single uvicorn worker | Python sync handlers in threadpool |
| Schools | 1,000 | OK | ~1M rows in tenant tables — composite indexes cover |
| Schools | 5,000+ | Bottleneck | `attendances` ~500M rows/yr → must partition |
| Students / school | 20,000 | ✓ | Composite `(school_id, student_id)` covers |
| Total students | 1M | Degraded at peak | Dashboard COUNTs, parent-portal N+1 |
| Background jobs | 9 scheduled + 1 worker | No burst capacity | All on one BackgroundScheduler in uvicorn |

### §6.2 — At 100 schools

- Single-writer DB ✓ at this scale
- Current thread-based sync worker ✓
- ~5,000 students/school × 100 = 500k students — manageable
- Redis rate limit + sessions is fine

### §6.3 — At 500 schools

- ~250k students × 5 years = school-row count similar to "at 1000 schools today" scenario: marginal
- Start needing a read replica specifically for dashboard COUNTs
- Excel export endpoint can OOM on 10k-row schools

### §6.4 — At 1,000 schools

- DB at ~25M rows in `students`, ~500M in `attendances` annually — **must partition**
- Sync queue of ~1M queued ops across tenants; row-level lock becomes critical
- APScheduler single-process potentially drops jobs
- Parent-portal N+1 → multiple seconds latency at peak

### §6.5 — At 100k students

- All of the above × 4
- Piecemeal of academic list endpoints unbounded — risk

### §6.6 — At 1M users

- Stripe / Chapa webhook scalability not addressed
- PARENT `is_view_only` outside-network flag determined per-request — fine but should be cached in Redis for the school's IP range TTL 5min

---

## §7 — WebHooks / Long-Running Operations

- **No asyncio task queue** — webhook processing happens synchronously inside the request, blocking worker threads
- `sync_service.process_queue` runs in the sync worker thread — locks rows with no `FOR UPDATE SKIP LOCKED` → double-processing risk under 2-worker deployment
- `archive_service.run_archive` runs nightly in APScheduler — single replica in current deployer; safe for now but no lock to prevent accidental double-archival under multi-replica

---

## §8 — Findings Summary

| # | Severity | Finding | File:Line |
|---|---|---|---|
| PF1 | **High** | Parent portal N+1 (6 queries × child) | `parent_portal.py:41-83` |
| PF2 | **High** | Student transcript N+1 | `students.py:264-268` |
| PF3 | **High** | Student portal N+1 (2 queries × subject) | `student_portal.py:93-101` |
| PF4 | **High** | Missing FK indexes on 7 hot paths | models |
| PF5 | **High** | asyncio.ensure_future silently fails — realtime broadcast lost | `nfc_v2_service.py:182` |
| PF6 | **Medium** | Dashboard COUNT cascade (7+ counts per request) | `dashboard.py:37-82` |
| PF7 | **Medium** | Unbounded list endpoints (academic + corporate departments + parents/search) | `academic.py:32-316`, `corporate.py:17`, `parents.py:43` |
| PF8 | **Medium** | Excel exports load entire unbounded result set into memory | export routes |
| PF9 | **Medium** | No app-data Redis cache (sessions/rate-limit only) | architecture-wide |
| PF10 | **Medium** | Single-writer DB → dashboard latency at peak | architecture |
| PF11 | **Low** | Per-replica scheduler runs every cron N × replicas | scheduler |
| PF12 | **Low** | O(E×R) mapping duplicated in 3 files | `students.py:294`, `report_cards.py:88`, `academic.py` marksheet |
| PF13 | **Low** | NFC scan 4 sequential queries | `nfc_v2_service.py:114` |

---

## §9 — Recommendation Priority

1. **PF1-PF3 — N+1:** refactor dashboards to batch fetches (`selectinload`, `IN` queries). Expected 5–10× dash speed-up.
2. **PF4 — Add FK indexes** via Alembic migration. Two-line migration, biggest single easy win.
3. **PF5 — asyncio bug** — convert sync handler to async OR `run_coroutine_threadsafe`. Restores NFC realtime features.
4. **PF7-PF8 — Pagination + streaming Excel** — prevent OOM at scale.
5. **PF6 — Dashboard caching** in Redis; TTL 60s keyed by `school_id`.
6. **PF10/PF11 — Eventually:** external worker queue + leader-only scheduler.

**Performance Score: 60/100** — deduct 25 for N+1 + missing indexes + asyncio bug; deduct 10 for unbounded list endpoints; deduct 5 for monolithic all-in-one-process at scale.

**End of PERFORMANCE_AUDIT.md**
