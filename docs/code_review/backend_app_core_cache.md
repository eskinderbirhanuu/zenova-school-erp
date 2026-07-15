# File Reviewed

`backend/app/core/cache.py` (101 lines)

## Overview

Redis-based caching utilities: `cache_response` (async decorator for endpoints), `get_cached_or_compute` (sync helper), and `invalidate_cache` (pattern-based key deletion using SCAN).

## Issues

### Issue 1 — `invalidate_cache` Uses SCAN + Delete — Not Atomic

- **Lines:** 82-101
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `invalidate_cache` uses `redis.scan()` in a loop and deletes matched keys. Between the scan and the delete, new cache entries with the same prefix could be created and immediately deleted.
- **Why it is a problem:** A concurrent request that sets a cache entry during the SCAN loop could lose its cached data. This creates a race condition where the cache is prematurely emptied.
- **Potential Impact:** Temporary cache miss for users who made a request during cache invalidation.
- **Recommended Fix:** Use Redis `UNLINK` (async delete) with a single pattern. Or accept the race condition and document it. Alternatively, version the cache keys.

### Issue 2 — Silent Failure on Cache Set/Delete Errors

- **Lines:** 27-28, 45-46, 75-76, 100-101
- **Severity:** Low
- **Category:** Error Handling
- **Description:** All `except Exception: pass` blocks silently swallow Redis errors.
- **Why it is a problem:** Redis failures become invisible — operators won't know caching is degraded.
- **Potential Impact:** Gradual performance degradation without alerts.
- **Recommended Fix:** Log warnings on cache failures instead of silently passing.

### Issue 3 — `cache_response` Tries to JSON-Serialize the Response

- **Line:** 73
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** The decorator calls `json.dumps(response)` on the function return value. If the endpoint returns a FastAPI `Response` object or a Pydantic model, this may fail or produce unexpected results.
- **Why it is a problem:** JSON serialization of ORM objects or FastAPI response objects can fail in non-obvious ways, and the error is silently caught.
- **Potential Impact:** Caching silently fails for endpoints that return complex types.
- **Recommended Fix:** Only cache if the response is a dict, list, or JSON-serializable type. Use `jsonable_encoder` from FastAPI.

### Issue 4 — `_get_cached` Returns Raw Bytes/String, Not Parsed JSON

- **Lines:** 14-18
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `_get_cached` returns the raw Redis value (string). Callers must know the data was JSON-serialized and parse it themselves.
- **Why it is a problem:** Inconsistent return types — sometimes the raw string, sometimes the parsed dict. The caller (`get_cached_or_compute`) wraps it in a Response object so the consumer doesn't need to parse, but this is implicit.
- **Potential Impact:** If a caller expects a dict but gets a string, they'll fail.
- **Recommended Fix:** Standardize the return format (always return string for Response wrapping, or always return parsed JSON for programmatic use).

## Security Review

- No security issues found. Caching is read-centric. Keys are hashed (no sensitive data in key names).
- Cache keys use SHA-256 of the request parameters — no data leak.

## Performance Review

- SCAN-based invalidation is appropriate for large key spaces (avoids blocking KEYS command).
- Cache TTL defaults to 300s — reasonable.
- No Redis connection pooling (one connection per call) — each cache function calls `get_redis()` which returns a singleton client, which is fine.

## Maintainability

- Clean, well-structured functions.
- Good docstrings with usage examples.
- The `invalidate_cache` comment shows how to use after creating a student — helpful.

## Architecture Review

- Decorator pattern for async endpoints is clean.
- Sync helper for sync endpoints is less elegant but functional.
- Cache invalidation by prefix (prefixed key naming) is the correct Redis cache pattern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 9/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
