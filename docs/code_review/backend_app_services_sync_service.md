# File Reviewed

`backend/app/services/sync_service.py` (275 lines)

## Overview

Offline-to-cloud synchronization service. Manages sync queue (`enqueue_sync`), processes pending items (`process_queue`), sends to VPS with HMAC authentication, and applies inbound sync payloads with conflict detection. Anti-DNS-rebinding validation.

## Issues

### Issue 1 — `process_queue` Uses Module-Level Global `VPS_SYNC_ENABLED`

- **Lines:** 7, 57-58
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `VPS_SYNC_ENABLED` is a module-level global that's set to `True` when a VPS URL exists. It's never reset to `False`.
- **Why it is a problem:** Once set to `True`, it remains `True` for the process lifetime, even if the VPS becomes unreachable or the identity changes.
- **Potential Impact:** Sync attempts continue to fail silently. The `get_queue_stats` endpoint reports `vps_connected: True` even when it's not.
- **Recommended Fix:** Determine VPS availability per-sync-cycle rather than using a persistent global flag.

### Issue 2 — `process_queue` Calls `_send_to_vps` in a Loop Without Batching

- **Lines:** 70-81
- **Severity:** Medium
- **Category:** Performance
- **Description:** Each pending sync item is sent individually via `_send_to_vps`. If there are 50 pending items, 50 separate HTTP requests are made.
- **Why it is a problem:** High latency for bulk sync. Each request has TCP + TLS + HTTP overhead.
- **Potential Impact:** Sync throughput is limited by network round-trip time per item.
- **Recommended Fix:** Batch multiple sync items into a single HTTP request.

### Issue 3 — `_send_to_vps` Uses `urllib.request` (Blocking) Instead of `httpx`

- **Lines:** 170-172
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Uses Python's `urllib.request` instead of `httpx` (which is already used elsewhere in the project).
- **Why it is a problem:** Code inconsistency. `httpx` provides connection pooling, async support, and better error handling.
- **Potential Impact:** No connection reuse across sync requests.

### Issue 4 — `retry_count` Is Stored as String, Parsed as String

- **Line:** 79
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `entry.retry_count` is `String(10)` and parsed as `str(int(entry.retry_count or "0") + 1)`. String encoding of integers is fragile.
- **Why it is a problem:** Same as the model issue — string comparison for numbers is unreliable.
- **Recommended Fix:** Change the model field to Integer.

### Issue 5 — `apply_sync_payload` Has Limited Conflict Resolution

- **Lines:** 198-244
- **Severity:** Medium
- **Category:** Functionality
- **Description:** Conflict detection only compares `incoming_version < str(local_ver.timestamp())`. There's no automatic resolution (last-writer-wins, multi-master merge).
- **Why it is a problem:** The conflict is logged but not resolved automatically. An administrator must manually resolve each conflict.
- **Potential Impact:** Sync backlog grows with unresolved conflicts, leading to data divergence.
- **Recommended Fix:** Implement last-writer-wins with conflict logging, or a CRDT-based approach.

### Issue 6 — `_send_to_vps` Has No TLS Certificate Validation

- **Lines:** 157-172
- **Severity:** Medium
- **Category:** Security
- **Description:** `urllib.request.urlopen` uses default SSL context which should verify certificates on Python 3.4+ by default.
- **Why it is a problem:** If certificate validation is disabled elsewhere or if a custom SSL context is used without verification, MITM attacks on sync data are possible.
- **Potential Impact:** Sync data could be intercepted/modified in transit.
- **Recommended Fix:** Explicitly pass an SSL context with verification.

## Security Review

- **Strong points:** Anti-DNS-rebinding validation (`_validate_vps_url_at_connect`), HMAC-signed sync payloads with server_id and timestamp, webhook retry limits.
- **Weak points:** No TLS certificate pinning, sync payloads not encrypted end-to-end.
- **Verdict:** Good sync security with anti-rebinding protection and HMAC authentication.

## Performance Review

- Per-item HTTP requests are the main bottleneck for bulk sync.
- `count()` queries for remaining pending items after processing — unnecessary extra query.

## Maintainability

- Well-structured with clear separation of enqueue, process, send, and receive.
- Priority-based ordering of sync items.

## Architecture Review

- The offline-first sync architecture is well-designed with priority queues, conflict detection, and anti-rebinding.
- Global `VPS_SYNC_ENABLED` state is an architectural smell.
- Per-item HTTP requests should be batched.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 6/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
