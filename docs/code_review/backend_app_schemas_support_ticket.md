# File Reviewed

`backend/app/schemas/support_ticket.py` (33 lines)

## Schemas

- `SupportTicketCreate`, `SupportTicketUpdate`, `SupportTicketResponse`.

## Issues

### Issue 1 — `school_name` Carried Through Schema

- **Lines:** 11, 24
- **Severity:** Note
- **Category:** Data Redundancy
- **Description:** Matches the model's denormalized `school_name` field.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
