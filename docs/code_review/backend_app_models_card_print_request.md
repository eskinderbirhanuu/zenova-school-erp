# File Reviewed

`backend/app/models/card_print_request.py` (21 lines)

## Model

- `CardPrintRequest` — workflow tracking: `card_type`, `reference_id`, `status`, three user references (requested/approved/printed by), `notes`.

## Issues

### Issue 1 — Three Separate User FK Columns

- **Lines:** 15-17
- **Severity:** Low
- **Category:** Architecture
- **Description:** `requested_by`, `approved_by`, `printed_by` track the print workflow. Good audit trail.

### Issue 2 — `reference_id` Has No FK Constraint

- **Lines:** 12
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** Polymorphic reference (student/staff/employee card). No FK enforced.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
