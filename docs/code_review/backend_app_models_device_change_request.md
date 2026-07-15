# File Reviewed

`backend/app/models/device_change_request.py` (27 lines)

## Model

- `DeviceChangeRequest` — hardware change tracking: `license_id`, `old_hardware_id`/`new_hardware_id`, `match_count`/`total_components`, `status`, reviewer references, `expires_at` with `is_expired()` method.

## Issues

### Issue 1 — Hardware IDs Stored as Comments

- **Lines:** 13-14
- **Severity:** Note
- **Category:** Architecture
- **Description:** `old_hardware_id` is "hardware components before change" and `new_hardware_id` is "base64 JSON". Descriptive comments — good.

### Issue 2 — `is_expired` Instance Method

- **Lines:** 26-27
- **Severity:** Note
- **Category:** Design
- **Description:** Convenience method on the model for auto-approval logic.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
