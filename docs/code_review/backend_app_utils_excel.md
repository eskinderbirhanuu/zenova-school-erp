# File Reviewed

`backend/app/utils/excel.py` (62 lines)

## Functions

- `parse_excel(file)` — validates extension, parses headers + rows, returns `list[dict]`.
- `generate_excel(headers, rows)` — creates XLSX in memory.
- `excel_response(headers, rows, filename)` — returns `StreamingResponse`.

## Issues

### Issue 1 — No Size Limit on Uploaded Excel

- **Lines:** 9-32
- **Severity:** Low
- **Category:** Security
- **Description:** No file size limit check — large XLSX files could exhaust memory.

### Issue 2 — All Values Converted to Strings

- **Lines:** 26
- **Severity:** Note
- **Category:** Data Integrity
- **Description:** All parsed values are converted to `str` — numeric data loses type information.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
