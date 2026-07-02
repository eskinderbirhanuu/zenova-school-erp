# Performance Audit — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 · **No code was modified.**

Each entry follows:

```
### Bottleneck
### Root Cause
### Recommended Optimization
### Expected Improvement
```

Target scale: 500–20,000 students per school, single-server (Ubuntu/old PC). Findings are ordered by likely production impact.

---

### Bottleneck 1 — N+1 query explosion in student transcript
- **Location:** `backend/app/api/v1/endpoints/students.py:226-330`
- **Root Cause:** Per-semester loop issues one query for exams, one for results, one for subjects, plus `next(...)` in-Python joins. For a student with 6 semesters × 8 subjects that is ~20–30 round-trips per request; 100 concurrent transcript views = thousands of queries.
- **Recommended Optimization:** Fetch all `Exam`/`ExamResult`/`Subject` rows for the student in two bulk queries with `exam_id IN (...)` and join in Python by dict; or use `selectinload(Exam.results)` / `joinedload`. Cache the computed transcript in Redis (TTL 5 min, invalidate on new result).
- **Expected Improvement:** ~20× fewer queries; p95 from seconds to <100 ms.

---

### Bottleneck 2 — Parent dashboard issues ~7 queries per child
- **Location:** `backend/app/api/v1/endpoints/parent_portal.py:41-97`
- **Root Cause:** For each linked student: a `Student` fetch, two `count(Attendance)` queries, a `ClassGrade` fetch, an `ExamResult join Exam join Subject` query, and an `Invoice` query. A parent with 3 children = ~21 queries.
- **Recommended Optimization:** Replace per-child `count()` with a single `GROUP BY student_id` attendance aggregate across all linked ids; batch invoice/results queries with `student_id IN (...)`. Cache dashboard JSON per parent (60s).
- **Expected Improvement:** ~21 → 4 queries; payload identical.

---

### Bottleneck 3 — `trial_balance` runs one sub-query per account
- **Location:** `backend/app/services/finance_service.py:631-649`
- **Root Cause:** Loops over accounts and, for each, runs `db.query(JournalLine).join(JournalEntry).filter(account_id == acct.id)`. With 100 accounts this is 100 round-trips fetching all lines into Python to sum.
- **Recommended Optimization:** Single aggregate: `SELECT account_id, SUM(debit), SUM(credit) FROM journal_lines JOIN journal_entries ... WHERE school_id = :sid GROUP BY account_id`.
- **Expected Improvement:** 100 queries → 1; removes Python-side summing of large row sets.

---

### Bottleneck 4 — COUNT()-based sequence numbers race and scan
- **Location:** `backend/app/services/finance_service.py:74-80, 236-242, 296-302` (`_next_entry_number`, `_next_invoice_number`, `_next_payment_number`)
- **Root Cause:** `count() + 1` on `LIKE 'JE-2026-%'`. (a) Race: two concurrent postings compute the same count → duplicate number or integrity error. (b) Performance: the `LIKE` prefix cannot use a unique index efficiently and scans grow with the year's volume.
- **Recommended Optimization:** Reuse `id_service.generate_id` which uses a locked `number_sequences` row (after fixing its first-insert race, AI-7). Extend `PREFIX_MAP` to `entry/invoice/payment`.
- **Expected Improvement:** O(1) locked increment; no duplicates; removes full scans.

---

### Bottleneck 5 — Export endpoints load everything into memory
- **Location:** `students.py:205-223` (`limit=5000`), `finance.py:262-318` (import/export)
- **Root Cause:** `export_students_excel` calls `search_students(..., limit=5000)` and builds the whole workbook in RAM; import endpoints parse the whole file then commit en masse.
- **Recommended Optimization:** Stream exports via `yield_per()` / server-side cursors and write the xlsx with a streaming writer (e.g. `openpyxl` write-only mode). For imports, process in chunks within a single transaction; cap row count.
- **Expected Improvement:** Constant memory; supports >50k rows without OOM; avoids worker blocking.

---

### Bottleneck 6 — Single uvicorn worker, no async offload
- **Location:** `backend/Dockerfile:14`, `docker-compose.yml`
- **Root Cause:** `uvicorn app.main:app --host 0.0.0.0 --port 8000` (no `--workers`). On a 4-core box, 75% of CPU is idle under load. Blocking calls (Excel, SMTP email send in `forgot_password`, file uploads) occupy the single worker.
- **Recommended Optimization:** `--workers $(nproc)` (or gunicorn `-k uvicorn.workers.UvicornWorker`). Offload SMTP, Excel, notifications, backups, sync to an Arq worker on Redis. Ensure sync DB code stays in threads (`run_in_threadpool`) so it doesn't block the event loop.
- **Expected Improvement:** ~3–4× throughput on multi-core; responsive UI during heavy jobs.

---

### Bottleneck 7 — Missing indexes on hot filter columns
- **Root Cause:** Most queries filter by `school_id`, `student_id`, `invoice_id`, `status`, `created_at`. Without composite indexes on e.g. `(school_id, created_at desc)`, `(student_id, due_date)` on invoices, `(school_id, entry_number)`, Postgres does seq scans as tables grow.
- **Recommended Optimization:** Audit `EXPLAIN ANALYZE` on the top-20 queries (dashboard, lists, portal) and add composite indexes. Add `idx_invoices_school_due`, `idx_journal_lines_account`, `idx_attendance_student_status`, `idx_payments_school_invoice`.
- **Expected Improvement:** List endpoint p95 from hundreds of ms to tens of ms at 20k rows.

---

### Bottleneck 8 — `record_payment` over-payment check holds invoice lock
- **Location:** `backend/app/services/finance_service.py:323-333`
- **Root Cause:** `with_for_update()` on the invoice is good for correctness but serializes all payments against the same invoice. Combined with the GL auto-posting (which itself creates accounts/entries), a single payment is a multi-statement transaction.
- **Recommended Optimization:** Keep the lock (correctness first), but ensure the GL posting (`_create_payment_journal_entry`) does not auto-create missing accounts inside the hot path — seed default accounts (`Cash on Hand`, `Student Fees Receivable`) at school setup so the payment path only inserts known rows.
- **Expected Improvement:** Shorter lock duration; fewer statement-cache misses.

---

### Bottleneck 9 — Auto-creation of accounts inside payment/wallet posting
- **Location:** `finance_service.py:344-360, 422-440`
- **Root Cause:** `_create_payment_journal_entry` and `_create_wallet_journal_entry` query for `Cash on Hand` / `Student Fees Receivable` / `Customer Deposits` and **create them on the fly if missing**, inside the payment transaction. First-ever payment per school does 2 extra SELECTs + possibly 2 INSERTs under lock.
- **Recommended Optimization:** Seed these accounts in `license_service.initialize_system` / `activate_system` at setup. Remove the auto-create branch (or keep only as a logged fallback).
- **Expected Improvement:** Removes 2–4 statements from the hot path; predictable GL.

---

### Bottleneck 10 — `log_audit` issues an extra COMMIT per mutation
- **Location:** `backend/app/core/audit.py:29` (cross-ref AI-5)
- **Root Cause:** Every audited mutation triggers a second `COMMIT`. For a bulk exam-result post of N students, that's N extra commits in a loop.
- **Recommended Optimization:** Make `log_audit` add-only; let callers commit once.
- **Expected Improvement:** Bulk operations become 1 commit instead of N+1; large latency win on `bulk_create_exam_results`, `bulk_promote_students`, Excel imports.

---

### Bottleneck 11 — `get_client_ip`/`decode_token` overhead per request
- **Location:** `deps.py`, `auth_service.decode_token`
- **Root Cause:** Every protected request decodes the JWT and hits the DB to load the user (`get_user_by_id`). There is no user object cache.
- **Recommended Optimization:** Cache a short-lived (30s) user snapshot in Redis keyed by `user_id` (invalidate on role/active/deleted change). Decode is cheap; the DB hit is the cost.
- **Expected Improvement:** Removes one DB round-trip from every authenticated request.

---

### Bottleneck 12 — License status re-validation may block startup/requests
- **Location:** `license_crypto.get_cached_license_status` + `_can_reach_license_server` (5s HTTP timeout)
- **Root Cause:** When the Redis cache expires (30 min), the next request synchronously validates, including a 5-second outbound HTTP ping to `license.zenovaerp.com`. On an air-gapped LAN this is a 5s stall on a user request.
- **Recommended Optimization:** Validate asynchronously (background task) and serve the last-known-good cached status; only restrict features after the offline grace truly expires. Never block a request on the outbound ping.
- **Expected Improvement:** Eliminates periodic 5s stalls; preserves offline-first guarantee.

---

## Summary Table

| # | Bottleneck | Effort | Impact |
|---|-----------|--------|--------|
| 1 | Transcript N+1 | M | High |
| 2 | Parent dashboard N+1 | M | High |
| 3 | trial_balance per-account | S | High (finance) |
| 4 | COUNT-based numbers (race+scan) | M | High (correctness+perf) |
| 5 | In-memory exports | M | Medium |
| 6 | Single worker | S | High (throughput) |
| 7 | Missing indexes | M | High at scale |
| 8/9 | Payment path lock + auto-create accounts | M | Medium |
| 10 | Audit self-commit | S–M | Medium (bulk) |
| 11 | Per-request user DB hit | S | Medium |
| 12 | License ping stalls requests | S | High (offline UX) |

**Priority for DeepSeek:** 6, 12, 4, 10 are quick wins with outsized impact; 1, 2, 3, 7 are the scale enablers. Sequencing and step-by-step fixes are in `DEEPSEEK_TASKS.md` (Task-16 covers the N+1 batch; Task-20 covers numbering; Task-05 covers audit commit; Task-21 covers worker/indexes/license-cache).
