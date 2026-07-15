# File Reviewed

`backend/app/models/nfc_scan_log.py` (19 lines)

## Model

- `NfcScanLog` — `card_uid` (indexed), `reference_type`/`reference_id`, `scan_type`, `scanned_at`, `reader_location`, `school_id`.

## Issues

### Issue 1 — `reference_id` Without FK

- **Lines:** 13
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** Polymorphic reference (student/staff/parent). No FK constraint.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
