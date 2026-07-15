# File Reviewed

`backend/app/models/support_ticket.py` (22 lines)

## Model

- `SupportTicket` — `ticket_number` (unique), `school_id`/`school_name` (denormalized), `subject`, `description`, `priority`, `status`, `assigned_to`, `created_by`.

## Issues

### Issue 1 — `school_name` Is Denormalized

- **Lines:** 13
- **Severity:** Low
- **Category:** Data Redundancy
- **Description:** `school_name` duplicates data from the schools table. Could drift if school is renamed.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
