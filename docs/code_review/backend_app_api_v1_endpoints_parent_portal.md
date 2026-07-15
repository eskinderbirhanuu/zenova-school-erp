# File Reviewed

`backend/app/api/v1/endpoints/parent_portal.py` (190 lines)

## Overview

Parent portal — dashboard (students with attendance, grades, fees), invoices list, and payment posting with automatic deterministic idempotency key.

## Issues

### Issue 1 — Dashboard Does N+1 Queries for Linked Students

- **Lines:** 35-89
- **Severity:** Medium
- **Category:** Performance
- **Description:** For each linked student, the code iterates and accesses `student_map.get(sid)`, `class_map.get(student.class_id)`, `att_by_student.get(sid)`, `grades_by_student.get(sid)`, `fees_by_student.get(sid)` — this is actually O(1) dictionary lookups, not N+1 queries. The actual DB queries are batched (lines 44, 49-52, 54-56, 63-65, 77-79). Good batch-loading pattern.

### Issue 2 — `parent_portal_dashboard` Constructs `fees_by_student` from Raw Invoices

- **Lines:** 80-89
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Uses `str(inv.total_amount)` and `str(inv.paid_amount)` — string coercion of Decimal values.

### Issue 3 — Deterministic Idempotency Key Pattern Is Clever

- **Lines:** 176-181
- **Severity:** Good
- **Category:** Design
- **Description:** Auto-generates an idempotency key based on `parent_id:invoice_id:minute` to collapse double-clicks within ~60 seconds. Falls back to explicit keys for genuine repeat payments.

### Issue 4 — No Pagination on Invoice/Result Lists

- **Lines:** 77-79, 140-155
- **Severity:** Low
- **Category:** Performance
- **Description:** Returns all invoices for a parent's children with no pagination.

### Issue 5 — `get_linked_student_ids` Raises HTTPException

- **Lines:** 126-132
- **Severity:** Low
- **Category:** Architecture
- **Description:** Helper function raises HTTPException, coupling utility code to FastAPI. Should return `None` or raise a specific exception.

## Security Review

- No explicit permission check (parent portal is self-service for parent-role users).
- Payment ownership verified via student link.
- Deterministic idempotency prevents duplicate payments.

## Performance Review

- Dashboard batches aggregate queries well.
- No pagination on invoices.

## Maintainability

- Dashboard logic is tightly coupled to response construction.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
