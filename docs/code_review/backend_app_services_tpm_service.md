# File Reviewed

`backend/app/services/tpm_service.py` (216 lines)

## Overview

TPM-based license sealing — uses TPM 2.0 when available for hardware-bound key sealing, with AES-GCM software fallback using PBKDF2-derived machine key.

## Issues

### Issue 1 — TPM Implementation Uses Temporary Files With Fixed Names

- **Lines:** 73-116
- **Severity:** High
- **Category:** Security
- **Description:** All TPM operations use hardcoded temp file paths (`/tmp/zenova_policy.dat`, `/tmp/zenova_key.priv`, `/tmp/zenova_sealed.bin`, `/tmp/zenova_sealed_in.bin`). Multiple processes on the same machine would conflict.
- **Why it is a problem:** Race condition and potential privilege escalation via symlink attacks on `/tmp`.
- **Potential Impact:** Another local user could read TPM-sealed data.
- **Recommended Fix:** Use `tempfile.mkstemp()` for unique temporary files.

### Issue 2 — TPM Persistence Key Handle Is Fixed (`0x81000001`)

- **Lines:** 101
- **Severity:** Medium
- **Category:** Reliability
- **Description:** Uses a hardcoded persistent key handle `0x81000001`. If another process already uses this handle, TPM operations fail.
- **Why it is a problem:** Conflict with other TPM-using applications.

### Issue 3 — TPM Windows Implementation Is a No-Op

- **Lines:** 118-128
- **Severity:** High
- **Category:** Functionality
- **Description:** The Windows TPM path tries `ctypes.windll.tpmvscmgr` which likely doesn't exist, catches `AttributeError`, and returns None. TPM sealing on Windows always falls back to software.

### Issue 4 — `_get_machine_key` Runs PBKDF2 Every Call

- **Lines:** 62-66
- **Severity:** Low
- **Category:** Performance
- **Description:** PBKDF2 with 100,000 iterations is called on every seal/unseal. This is CPU-intensive (100ms+ per call).
- **Potential Impact:** License validation startup delay.

### Issue 5 — Software Fallback Uses Machine Fingerprint as Key Source

- **Lines:** 62-66
- **Severity:** Low
- **Category:** Security
- **Description:** The machine fingerprint (which could be predictable if components change) is the sole entropy source for the software key.

## Security Review

- TPM sealing is hardware-bound — strong.
- Software fallback is reasonable for non-TPM systems.
- Fixed temp file paths are a security concern.

## Performance Review

- PBKDF2 100k iterations is slow but appropriate for key derivation.
- TPM subprocess calls have 30s timeouts.

## Maintainability

- Well-structured with clear TPM/software fallback separation.
- Versioned output prefix (`tpm1:`, `sw1:`) enables future format changes.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 5/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
