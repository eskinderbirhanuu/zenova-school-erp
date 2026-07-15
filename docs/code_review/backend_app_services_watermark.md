# File Reviewed

`backend/app/services/watermark.py` (123 lines)

## Overview

Watermark and honeytoken service — sets per-school watermarks, XOR encryption for response headers, and a honeytoken registry to trace leaked/pirated data back to the source school.

## Issues

### Issue 1 — `encrypt_watermark` Uses XOR With Fixed Global Key

- **Lines:** 25-30
- **Severity:** Medium
- **Category:** Security
- **Description:** XOR encryption with `SCHOOL_WATERMARK` as the key. XOR is trivially reversible — the key can be recovered by XORing known plaintext with ciphertext. This is obfuscation, not encryption.
- **Why it is a problem:** School IDs in response headers are trivially decodable.
- **Potential Impact:** No security benefit from the "encryption".

### Issue 2 — `SCHOOL_WATERMARK` Is Not Defined in This Module

- **Lines:** 27, 35
- **Severity:** High
- **Category:** Bug
- **Description:** References `SCHOOL_WATERMARK` (uppercase) but it's not defined anywhere in the file. The global is `_WATERMARK_OVERRIDE` and the env var is `"SCHOOL_WATERMARK"` (string, not variable). This would cause a `NameError` at runtime.
- **Why it is a problem:** `encrypt_watermark` and `decrypt_watermark` will crash.
- **Potential Impact:** Feature is broken.
- **Recommended Fix:** Use `get_watermark()` instead.

### Issue 3 — Honeytoken Registry Is In-Memory Only

- **Lines:** 49, 52-61
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `HONEYTOKEN_REGISTRY` is a global dict that is populated in-memory on server startup. If the server restarts, the registry is empty and `identify_school_from_honeytoken` returns nothing.
- **Why it is a problem:** After server restart, honeytokens cannot be traced back to schools.
- **Potential Impact:** Anti-piracy feature is lost on restart.

### Issue 4 — `register_school_honeytokens` Uses `hash()` Which Changes Per Process Restart

- **Lines:** 60
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `hash(watermark)` and `hash(watermark[::-1])` produce different values after each Python process restart due to PYTHONHASHSEED randomization.
- **Why it is a problem:** The honeytoken ISBN is non-deterministic across restarts.
- **Potential Impact:** Identifying leaked data after restart is impossible.

### Issue 5 — `watermark_seed_data` Uses `school_id[:8]` for Honeytoken Student ID

- **Lines:** 99
- **Severity:** Low
- **Category:** Uniqueness
- **Description:** The HT- student ID uses `school_id[:8]` which could collide for schools with the same first 8 chars.

## Security Review

- Creative anti-piracy honeytoken approach — good idea.
- Honeytokens are seeded into the database — can be detected in leaked data.
- XOR encryption is weak but acceptable for response header obfuscation.

## Performance Review

- No concerns.

## Maintainability

- Simple file with clear sections.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 5/10 |
| Security | 4/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 5/10 |
| Enterprise Readiness | 4/10 |
