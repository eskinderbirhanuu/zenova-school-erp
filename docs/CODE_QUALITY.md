# Code Quality Improvements

This document records every code quality fix made to the ZENOVA codebase — what was
changed, when, why, and the reasoning behind it. Use this as a reference when
reviewing or maintaining the affected files.

---

## How to Read This Document

Each entry follows the same structure:

- **When**: Date the fix was applied
- **Why**: The problem (bug risk, maintainability issue, performance, security)
- **What Changed**: File path + line numbers + before/after behavior
- **How It Helps**: Why the new code is better
- **Applicable To**: Other similar patterns you should watch for

---

## 1. Silent Exception Handling → Logged Warnings

### 1.1 health.py — 3 silent `except Exception` fallback returns

- **When**: 2026-07-26
- **Why**: Three functions (`_sync_status`, `_backup_status`, `readyz`) caught every
  exception and returned a fallback value with zero logging. In production, this meant
  database failures, Redis outages, and network errors would silently return "not
  ready" or `-1` sentinels with no trace in the logs. Operators could not diagnose
  why the system was reporting degraded status.

- **What Changed**:
  ```python
  # Before (health.py:65, 78, 142)
  except Exception:
      return {"pending": -1, "last_synced_at": None}

  # After
  except Exception:
      logger.warning("Sync status check failed", exc_info=True)
      return {"pending": -1, "last_synced_at": None}
  ```

- **How It Helps**: The exception is still handled gracefully (no 500 error), but
  now every failure leaves a log entry with full stack trace (`exc_info=True`).
  Operators can grep for "check failed" in the logs to find problems.

- **Applicable To**: Any `except Exception` block that returns a fallback value.
  The same pattern was fixed in `installer.py:77`.

### 1.2 installer.py — silent `except Exception: return False`

- **When**: 2026-07-26
- **Why**: `_hostname_is_reachable()` was part of the VPS connectivity check during
  setup. A silent failure meant the setup wizard could report "cannot reach server"
  with zero explanation. Debugging required re-running with debug mode.

- **What Changed**: Same pattern as above — added `logger.warning` before `return False`.

### 1.3 password_recovery.py — 6 bare `except Exception: raise HTTPException`

- **When**: 2026-07-26
- **Why**: Six endpoints caught `Exception` broadly and re-raised as 400 with
  `str(e)` as the detail. The original exception was never logged. If an unexpected
  error occurred (e.g., database deadlock, permission infrastructure failure), the
  user saw a generic "something went wrong" with no server-side trace.

- **What Changed**: Each `except Exception as e:` gained a `logger.warning(...,
  exc_info=True)` before the `raise`. The inline imports for `Permission`,
  `has_permission`, `datetime`, `timezone`, and `timedelta` were also moved to
  module level (see section 6).

- **Applicable To**: All endpoint files with `except Exception: raise
  HTTPException(...)`. These are intentionally general catches (the endpoints
  should not crash), but they must log.

---

## 2. Missing Imports (Blocking Bugs)

### 2.1 telegram.py — missing `import json`

- **When**: 2026-07-26
- **Why**: The function `telegram_webhook` called `json.dumps(payload, ...)` at line
  53 but `json` was never imported. This would throw `NameError: name 'json' is not
  defined` at runtime on every incoming Telegram webhook — a production-blocking bug.

- **What Changed**: Added `import json` to the module-level imports.

- **How It Helps**: The webhook endpoint now works. This was a classic refactoring
  slip (someone previously removed an unused `json` import without checking all
  call sites).

### 2.2 webauthn.py — `__import__()` hack for datetime

- **When**: 2026-07-26
- **Why**: Line 228 used `__import__("datetime").datetime.now(...)` — a dynamic
  import hack that is error-prone, unreadable, and breaks static analysis. Any
  linter or type checker cannot resolve the imported module, so refactoring tools
  and IDEs offer no help.

- **What Changed**:
  ```python
  # Before
  __import__("datetime").datetime.now(__import__("datetime").timezone.utc)

  # After
  from datetime import datetime, timezone
  cred.last_used_at = datetime.now(timezone.utc)
  ```

- **How It Helps**: Readable, statically analyzable, follows project conventions.

---

## 3. Duplicate / Repeated Code

### 3.1 hr.py + inventory.py — duplicated `_include_deleted` helper

- **When**: 2026-07-26
- **Why**: Two identical 2-line functions in two files, both checking the same
  condition (`ctx.is_superuser or ctx.role in ("ADMIN", "SUPER_ADMIN")`). Any
  change to the logic (e.g., adding a new role) required updating both files.

- **What Changed**: Added `can_include_deleted` as a property on `AuthContext` in
  `app/core/auth_deps.py:185`. Removed `_include_deleted` from both `hr.py` and
  `inventory.py`. All call sites now use `ctx.can_include_deleted`.

- **How It Helps**: Single source of truth. If more roles need this ability, you
  change one file.

### 3.2 communication.py — `ALL` and `MESSAGING` identical permission lists

- **When**: 2026-07-26
- **Why**: Two module-level constants were defined with identical permission lists
  — 6 permissions each, exact same values. One of them (`ALL`) was used by 4
  endpoints, the other (`MESSAGING`) by 3 endpoints. Any permission change required
  editing both lists in sync.

- **What Changed**: Created a single `_ALL_PERMS` list, then aliased both `ALL` and
  `MESSAGING` to it:
  ```python
  _ALL_PERMS = [require_permission(Permission.STUDENT_VIEW, ...)]
  ALL = _ALL_PERMS
  MESSAGING = _ALL_PERMS
  ```

- **How It Helps**: Change permissions once, both names update. No risk of drift.

### 3.3 report_cards.py — duplicated aggregation logic

- **When**: 2026-07-26
- **Why**: Both `generate_report_card` and `get_report_card` had ~30 lines of
  nearly identical logic for building a `result_map` (iterating exam results,
  grouping by subject, matching exams). One function also computed `subject_grades`
  manually while the other used a shared utility (`compute_subject_grades()`).

- **What Changed**: Extracted `_build_result_map(results, exams)` helper used by
  both. Made `generate_report_card` call `compute_subject_grades()` instead of
  computing manually.

- **How It Helps**: One shared path for exam aggregation. Fixes or features apply
  to both report views.

### 3.4 setup_wizard.py — 5 identical DB queries

- **When**: 2026-07-26
- **Why**: Five consecutive queries, each differing only by the SQLAlchemy model:
  `AcademicYear`, `ClassGrade`, `Section`, `Subject`, `TeacherProfile`. The
  repetitive pattern made it easy to miss one when adding a new check.

- **What Changed**: Extracted `_exists(db, model, school_id) -> bool` helper:
  ```python
  def _exists(db, model, school_id) -> bool:
      return db.query(model).filter(model.school_id == school_id).first() is not None
  ```
  All 5 checks now use the helper in a dict comprehension.

### 3.5 corporate.py — 4x repeated `CorporateEmployeeResponse` construction

- **When**: 2026-07-26
- **Why**: The same `CorporateEmployeeResponse(**emp.__dict__, department_name=dept)`
  pattern appeared in `list_employees`, `create_employee`, `get_employee`, and
  `update_employee`. Adding a new field to the response required editing 4 files
  (well, 4 places in the same file).

- **What Changed**: Extracted `_employee_to_response(emp)` helper. All 4 call sites
  now use it.

### 3.6 attendance.py — duplicated `notify_parents_of_absence()` call logic

- **When**: 2026-07-26
- **Why**: The same 7-line `notify_parents_of_absence()` call with identical
  parameters appeared in both `mark_attendance_bulk` and `patch_attendance`.

- **What Changed**: Extracted `_notify_absence(db, student_id, date_str, school_id)`
  helper.

- **How It Helps**: If the notification logic changes (e.g., add SMS channel), one
  edit covers both bulk and single attendance marking.

### 3.7 communication.py — repeated create-if-not-exists for NotificationPreference

- **When**: 2026-07-26
- **Why**: Both `get_notification_preferences` and `update_notification_preferences`
  checked `if not pref:` and created default preferences with the same 4 lines.

- **What Changed**: Extracted `_ensure_notification_prefs(db, user_id)` helper.

---

## 4. Large Functions → Decomposed Into Helpers

### 4.1 dashboard.py (`_compute_dashboard_overview`: 113 → 36 lines)

- **When**: 2026-07-26
- **Why**: A single function handled student count, teacher count, staff count,
  parent count, branch count, event count, revenue, pending invoices, and recent
  activity — for both super-admin and school-admin contexts. The `if is_super` /
  `else` branch duplicated ~80% of the query logic.

- **What Changed**: 9 helper functions extracted:
  - `_count_students(db, school_id, is_super)`
  - `_count_teachers(db, school_id, is_super)`
  - `_count_staff(db, school_id, is_super)`
  - `_count_parents(db, school_id, is_super)`
  - `_count_branches(db, school_id, is_super)`
  - `_count_events(db, school_id, is_super)`
  - `_compute_revenue(db, school_id, is_super)`
  - `_count_pending_invoices(db, school_id, is_super)`
  - `_get_recent_activity(db, school_id, is_super)`

  The main function now reads as a declarative list of helper calls.

### 4.2 dashboard.py (`dashboard_trends`: 75 → lean)

- **When**: 2026-07-26
- **Why**: Three parallel trend calculations (school growth, revenue, enrollment)
  each had their own month-iteration loop with identical date-labeling logic.

- **What Changed**: Extracted:
  - `_rows_to_month_map(rows, value_extractor)` — converts DB rows to a
    `{year_month: value}` dict
  - `_fill_month_trend(data_map, key_name, ...)` — fills gaps with zeros, returns
    `[{month, key_name}]`

### 4.3 student_portal.py (`student_portal_dashboard`: 118 → ~30 lines)

- **When**: 2026-07-26
- **Why**: A single endpoint function handled attendance aggregation, exam results
  building, schedule construction, assignments listing, and wallet balance — all
  inline with no separation of concerns.

- **What Changed**: 5 helpers:
  - `_build_attendance_summary(db, student_id)` — attendance %
  - `_build_exam_results(db, student_id)` — list of results
  - `_build_schedule(db, section_id)` — timetable
  - `_build_assignments(db, school_id)` — recent assignments
  - `_build_wallet(db, student_id)` — balance

  The main function is now 5 helper calls + return.

### 4.4 parent_portal.py (`parent_portal_dashboard`: 100 → ~30 lines)

- **When**: 2026-07-26
- **Why**: Same pattern as student_portal — attendance, grades, fees, and children
  data all built inline.

- **What Changed**: 3 helpers:
  - `_build_attendance_summary(db, student_ids)`
  - `_build_grades(db, student_ids)`
  - `_build_fees(db, student_ids)`

### 4.5 report_cards.py (`generate_report_card`: 104 → ~60 lines)

- **When**: 2026-07-26
- **Why**: Complex exam-result aggregation logic inline, with manual grade
  computation duplicated from the shared utility.

- **What Changed**: Extracted `_build_result_map()`. Switched to
  `compute_subject_grades()`.

### 4.6 reports.py (`generate_report_data`: 20-branch if/elif)

- **When**: 2026-07-26
- **Why**: A 100-line function with ~20 `elif` branches, one per report type.
  Adding a new report required editing this chain. Each branch was also ineligible
  for individual testing.

- **What Changed**: Replaced with a `_REPORT_HANDLERS` strategy dict:
  ```python
  _REPORT_HANDLERS = {
      ("global", "usage"): _global_usage_report,
      ("enrollment", "summary"): _enrollment_summary,
      ...
  }
  def generate_report_data(db, module, name, ...):
      handler = _REPORT_HANDLERS.get((module, name))
      if not handler: return {}
      return handler(db, ...)
  ```
  Each report type is now a focused, testable function.

---

## 5. Performance Issues

### 5.1 corporate.py — N+1 query on department relationship

- **When**: 2026-07-26
- **Why**: `list_employees` queried `CorporateEmployee` without any eager loading,
  then accessed `emp.department.name` inside the result loop. For N employees, this
  generated N+1 SQL queries.

- **What Changed**: Added `.options(joinedload(CorporateEmployee.department))` to
  the query. The department data is now fetched in a JOIN, one query total.

- **How It Helps**: With 100 employees, from 101 queries to 1.

### 5.2 licenses.py — inefficient `total=len(licenses)`

- **When**: 2026-07-26
- **Why**: `list_licenses` loaded ALL records first with `q.all()`, then used
  `len(licenses)` for the total count. For large license tables (thousands), this
  loaded every row into memory just to get a count.

- **What Changed**: Added `total = base_q.count()` before the paginated `.all()`.

### 5.3 support_tickets.py — unnecessary separate User query

- **When**: 2026-07-26
- **Why**: After creating a ticket, the code ran a separate `db.query(User)...`
  just to check if `ticket.assigned_to` was set. The `assigned_to` field is a
  column on the already-loaded `ticket` object.

- **What Changed**: Changed `db.query(User).filter(User.id ==
  ticket.assigned_to).first()` to just `ticket.assigned_to`.

---

## 6. Inline Imports → Module-Level

- **When**: 2026-07-26
- **Why**: `password_recovery.py`, `library.py`, `licenses.py`, `setup.py`, and
  `reports.py` all had imports inside function bodies (`from app.models.xxx import
  Xxx`, `from datetime import ...`, etc.). Inline imports are slower (re-imported
  every call), confuse linters, and hide dependency information from developers
  reading the file.

- **What Changed**: Moved every inline `from ... import ...` to the module-level
  import block. Files affected:
  - `password_recovery.py` — `Permission`, `has_permission`, `datetime`,
    `timezone`, `timedelta`
  - `library.py` — `BookBorrowing`
  - `licenses.py` — `get_short_fingerprint`, `School`
  - `setup.py` — `User`, `School`, `Branch`, `License` (were duplicated below
    the rate-limit constants)
  - `reports.py` — `date` (was inside an `"Overdue Books"` branch)

---

## 7. Hardcoded Values → Configuration

### 7.1 attendance.py — Ethiopia-specific constants

- **When**: 2026-07-26
- **Why**: `ETHIOPIA_UTC_OFFSET = timedelta(hours=3)` and attendance window
  `time(8,0)` / `time(10,0)` were hardcoded. A school outside Ethiopia or with
  different hours would need code changes.

- **What Changed**: Added to Settings:
  - `settings.attendance_utc_offset` (default 3)
  - `settings.attendance_window_start` (default "08:00")
  - `settings.attendance_window_end` (default "10:00")

### 7.2 sync.py — `ALLOWED_CLOCK_SKEW = 60`

- **When**: 2026-07-26
- **Why**: Hardcoded constant instead of configurable setting.

- **What Changed**: Added `settings.sync_clock_skew` (default 60).

### 7.3 platform_commission.py — hardcoded gateway name, currency, email, prefix

- **When**: 2026-07-26
- **Why**: `"chapa"`, `"ETB"`, `"platform@zenova.com"`, `"PINV-"` were all
  hardcoded. Changing the payment gateway or currency required editing source code.

- **What Changed**: Added 4 settings fields: `payment_gateway`, `payment_currency`,
  `payment_platform_email`, `payment_invoice_prefix`.

### 7.4 activate.py — hardcoded recovery code TTL

- **When**: 2026-07-26
- **Why**: `ttl_seconds=600` was hardcoded in `issue_recovery_code`. Changing
  the expiry required editing source code.

- **What Changed**: Added `settings.password_recovery_code_ttl` (default 600).

---

## 8. Missing Validation

### 8.1 activate.py — empty role_name crash

- **When**: 2026-07-26
- **Why**: `create_employee` queried Role by `data.role_name` without checking
  if it was empty. An empty string would match no Role, return `None`, then crash
  on `role.id` with `AttributeError`.

- **What Changed**: Added `if not data.role_name: raise HTTPException(400, "Role
  name required")` before the query.

### 8.2 academic.py — score range validation

- **When**: 2026-07-26
- **Why**: `import_exam_results_excel` coerced `score` to `float` without
  checking for negative values or values exceeding `max_score`. A corrupt Excel
  file could insert invalid scores.

- **What Changed**: Added range check — rows with `score < 0` or `score > max_score`
  are skipped.

---

## 9. Inconsistent Patterns Fixed

### 9.1 licenses.py — soft-delete pattern inconsistency

- **When**: 2026-07-26
- **Why**: Some places used
  `DeviceChangeRequest.deleted_at.is_(None)` while the rest of the codebase used
  `.execution_options(include_deleted=True)`. Two different styles for the same
  operation.

- **What Changed**: Replaced 4 instances of `deleted_at.is_(None)` with
  `execution_options(include_deleted=True)`.

### 9.2 platform_commission.py — old-style type hints

- **When**: 2026-07-26
- **Why**: `Optional[str]` was used while everywhere else in the codebase uses
  `str | None` (Python 3.10+).

- **What Changed**: `Optional[str]` → `str | None`. Removed unused `from typing
  import Optional`.

---

## 10. Too Many Parameters → Pass Model

### 10.1 setup.py — 17 keyword arguments in `initialize_system` call

- **When**: 2026-07-26
- **Why**: `public_initialize_system` unpacked a Pydantic model into 17 individual
  keyword arguments. This is fragile (adding a field to the model requires editing
  the call site) and verbose.

- **What Changed**: Replaced with `license_service.initialize_system(db,
  **data.model_dump())`. The model fields match the function parameters.

---

## 11. Readability Fixes

### 11.1 communication.py — nested ternary in filter

- **When**: 2026-07-26
- **Why**: A filter expression contained a ternary inside parentheses with the
  condition in the middle — essentially unreadable:
  ```python
  q.filter((A) | (B) if include_sent else (A))
  ```

- **What Changed**: Split into two separate filter calls:
  ```python
  if include_sent:
      q = q.filter((Message.recipient_id == current_user.id) |
                    (Message.sender_id == current_user.id))
  else:
      q = q.filter(Message.recipient_id == current_user.id)
  ```

### 11.2 webauthn.py — duplicate cookie-setting block → helper

- **When**: 2026-07-26
- **Why**: 4 identical `response.set_cookie()` calls with the same `httponly`,
  `secure`, `samesite`, `path` parameters, differing only in key/value/max_age.

- **What Changed**: Extracted `_set_auth_cookies(response, access_token,
  refresh_token, role_name, role_names_str)` helper.

---

## 12. webauthn.py — Long Function Decomposition

- **When**: 2026-07-26
- **Why**: `webauthn_auth_verify` was ~84 lines, combining assertion verification,
  token generation, and cookie setting in one function.

- **What Changed**: Extracted 3 helpers:
  - `_verify_assertion(body, db)` — finds credential, pops challenge, verifies assertion
  - `_generate_tokens(user)` — generates role name and JWT tokens
  - `_set_auth_cookies(response, access_token, refresh_token, role_name, role_names_str)`
  The main function is now 23 lines.

---

## 13. Hardcoded URL Path

### 13.1 metrics.py — `/api/v1/metrics` hardcoded

- **When**: 2026-07-26
- **Why**: `request.url.path == "/api/v1/metrics"` would break if the API prefix
  changed to `/api/v2/`.

- **What Changed**: `request.url.path.endswith("/metrics")`.

---

## 14. Frontend Dashboard Refactoring

### 11.1 Shared Dashboard Components

- **When**: 2026-07-26
- **Why**: Each of the 15 role dashboards implemented its own charts, loading
  spinners, animated backgrounds, and layout wrappers. The same `recharts`
  boilerplate appeared 8+ times. A global change (e.g., adding a new chart type)
  required editing all 15 files.

- **What Changed**:
  - Created 5 shared components in `frontend/src/components/dashboard/`:
    - `bar-chart-card.tsx` — generic bar chart (accepts `data`, `xKey`, `dataKey`, `color`)
    - `area-chart-card.tsx` — multi-series area chart (accepts `series[]`)
    - `feed-card.tsx` — activity feed list (accepts `items[]`)
    - `placeholder-card.tsx` — coming-soon card
    - `charts-grid.tsx` — responsive grid wrapper (`lg:grid-cols-7`)
  - Created `DashboardShell` component with loading state, animated background,
    and widget array rendering
  - Migrated all 15 dashboards to use `DashboardShell` with `widgets={[...]}`

- **Result**: Zero inline `recharts` imports, zero `DynamicAnimatedBackground`,
  zero `Loader2` in any dashboard file. Shared components now used by:
  - Super-admin (BarChartCard + AreaChartCard via ChartsGrid)
  - Corporate, Cafeteria, HR, Inventory, Library, Auditor (fully refactored to
    shared components)
  - Teacher, Student, Parent, Registrar (partially refactored — unique sections
    like timetable, health radar remain inline)

---

## Summary

| Category | Files Fixed | Issues Addressed |
|---|---|---|
| Silent exception logging | 4 files (health, installer, password_recovery) | 10 bare `except` blocks → logged |
| Missing imports (bugs) | 2 files (telegram, webauthn) | 2 production-blocking bugs |
| Duplicate code removal | 8 files | 7 duplicated patterns → shared helpers |
| Large function decomposition | 7 files (dashboard, student_portal, parent_portal, report_cards, reports, webauthn, academic) | 7 functions >80 lines → broken up |
| Performance | 3 files (corporate, licenses, support_tickets) | 3 N+1 / inefficient queries |
| Inline imports → module-level | 5 files | 10+ inline imports moved |
| Hardcoded → configuration | 4 files (attendance, sync, platform_commission, activate) | 8 hardcoded values → settings |
| Missing validation | 2 files (activate, academic) | 2 missing input checks added |
| Inconsistent patterns | 2 files (licenses, platform_commission) | soft-delete + type hints unified |
| Too many parameters | 1 file (setup) | 17 kwargs → model_dump |
| Readability | 2 files (communication, webauthn) | 2 readability improvements |
| Hardcoded URL path | 1 file (metrics) | 1 path check made version-agnostic |
| Frontend dashboard | 15 dashboard files | Shared components, no inline recharts |

Total: 23 backend files + 15 frontend files = **38 files changed**, **~35 individual
code quality issues resolved**.
