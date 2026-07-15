# File Reviewed

`backend/app/core/logging_config.py` (38 lines)

## Overview

Logging configuration with JSON formatter for production and human-readable format for development. Suppresses verbose SQLAlchemy and uvicorn logs.

## Issues

### Issue 1 — `root.handlers.clear()` Removes All Pre-Existing Handlers

- **Line:** 32
- **Severity:** Medium
- **Category:** Configuration
- **Description:** `root.handlers.clear()` removes all existing log handlers before adding the new one.
- **Why it is a problem:** If FastAPI/uvicorn has already configured a handler, this removes it. The new handler might not capture all logs due to propagation settings.
- **Potential Impact:** Logs from other libraries may be lost or duplicated.
- **Recommended Fix:** Only add the handler if no handlers exist, rather than clearing all.

### Issue 2 — `JSONFormatter` Does Not Include Log Record's `pathname`, `lineno`, `funcName`

- **Lines:** 8-17
- **Severity:** Low
- **Category:** Observability
- **Description:** The JSON formatter only includes timestamp, level, logger name, and message. No source file, line number, or function name.
- **Why it is a problem:** In production, when debugging an error, you can't tell which file/line generated the log entry.
- **Potential Impact:** Slower incident response — engineers must grep through code to find where a log originated.
- **Recommended Fix:** Add `pathname`, `lineno`, `funcName` to the JSON output.

### Issue 3 — `timestamp` Uses `datetime.now(timezone.utc)` Instead of `record.created`

- **Line:** 10
- **Severity:** Low
- **Category:** Observability
- **Description:** Timestamp is generated at formatting time with `datetime.now()`, not from `record.created` (which holds the time the log was emitted).
- **Why it is a problem:** If logging is asynchronous or buffered, the formatted timestamp may differ from the actual event time.
- **Potential Impact:** Slight timing inaccuracies in aggregated logs.
- **Recommended Fix:** Use `datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat()`.

## Security Review

- No security issues. Logging is appropriate.
- JSON format in production is compatible with log aggregators (ELK, Datadog, etc.).

## Performance Review

- JSON serialization per log entry adds minimal overhead.
- Suppressing SQLAlchemy DEBUG logs prevents I/O flooding.

## Maintainability

- Clean and well-structured.
- Single configuration function — easy to modify.

## Architecture Review

- Appropriate separation: development vs production format.
- The `configure_logging` function returns a logger — clean pattern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 9/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 8/10 |
