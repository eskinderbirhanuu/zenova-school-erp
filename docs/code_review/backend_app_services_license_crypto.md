# File Reviewed

`backend/app/services/license_crypto.py` (793 lines)

## Overview

License cryptography service — the core of ZENOVA's anti-piracy system. Implements hardware fingerprinting (8 components), VM/Docker detection, environment-aware grace periods, RSA-signed license files, cloud license verification, TPM sealing, and 75% component-matching for hardware change tolerance.

## Issues

### Issue 1 — `subprocess.run` Calls Without Full Path

- **Lines:** 87-89, 219-220, 236-237, 245-246, 286-287, 306-307
- **Severity:** Medium
- **Category:** Security
- **Description:** Multiple `subprocess.run` calls use command names without full paths (e.g., `["wmic", ...]`, `["udevadm", ...]`).
- **Why it is a problem:** If an attacker can modify the PATH environment variable, they could inject malicious executables.
- **Potential Impact:** Privilege escalation via PATH injection.
- **Recommended Fix:** Use full paths (`C:\Windows\System32\wbem\WMIC.exe`, `/sbin/udevadm`) or validate the command path.

### Issue 2 — `subprocess.run` on Windows With `wmic` May Block Indefinitely

- **Lines:** 87-89, 219-220, 245-246, 286-287, 306-307
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `timeout=5` is set on all subprocess calls, but the previous without `shell=True` is fine. However, `wmic` can hang on some Windows configurations without proper cleanup.
- **Why it is a problem:** A hanging `wmic` process could delay startup by 5 seconds per call, with 5+ calls per startup.
- **Potential Impact:** App startup delayed by 25+ seconds on some Windows systems.
- **Recommended Fix:** Cache subprocess results in memory to avoid repeated calls. Use a timeout with kill.

### Issue 3 — `_collect_fingerprint_components` Reads `/proc/cpuinfo` for CPU Serial — Raspberry Pi Only

- **Lines:** 199-203
- **Severity:** Low
- **Category:** Compatibility
- **Description:** CPU serial from `/proc/cpuinfo` only works on ARM boards (Raspberry Pi). x86 CPUs don't have a Serial entry.
- **Why it is a problem:** On x86 Linux systems, `cpu_serial` will always be "no-cpu-serial", reducing fingerprint entropy.
- **Potential Impact:** Fewer unique components on x86 systems, increasing collision risk.

### Issue 4 — Offline Grace Period Start Is Set on Every Offline Check but Not Persistently Reset

- **Lines:** 713-715
- **Severity:** Low
- **Category:** Functionality
- **Description:** `offline_grace_start` is set to "now" on the first offline check. But if the server briefly goes online and then offline again, the grace period starts from the offline point, not from the last online check.
- **Why it is a problem:** A server that briefly connects once every 44 days would never expire (45-day grace resets each offline period).
- **Potential Impact:** Licensees can avoid expiration by brief daily online checks.
- **Recommended Fix:** Only reset `offline_grace_start` on successful online validation, not on every offline check.

### Issue 5 — `get_cached_license_status` Creates a New DB Session Every Call

- **Lines:** 738-759
- **Severity:** Low
- **Category:** Performance
- **Description:** Creates `SessionLocal()` on every call. If called frequently (every request via middleware), this creates unnecessary DB connections.
- **Why it is a problem:** Connection pool exhaustion under load.
- **Recommended Fix:** Use the existing request-scoped DB session if available.

### Issue 6 — Exception Handling Broad Catching in `_collect_fingerprint_components`

- **Lines:** 194, 205-206, 228-229, 254-255, 262-263, 268-269, 295-296, 316-317
- **Severity:** Low
- **Category:** Resilience
- **Description:** Each component collection has a `try/except Exception: pass` or `try/except Exception: comp["key"] = "no-key"` pattern.
- **Why it is a problem:** Genuine errors (permissions, corrupted files) are silently swallowed, making debugging difficult.
- **Recommended Fix:** Log warnings for unexpected errors, not just suppress them.

### Issue 7 — `OSError/FileNotFoundError` Not Caught Explicitly in File Operations

- **Lines:** 66-71, 80-85, 101-108, 119-126, 182-195, 199-203, 211-217, 234-239, 272-284, 301-305
- **Severity:** Low
- **Category:** Reliability
- **Description:** Broad `except Exception` catches all error types. File-not-found errors should be distinguished from permission errors.
- **Potential Impact:** Permission failures are invisible — the system silently uses default values.

## Security Review

- **Strong points:** Environment-aware hardware fingerprinting (8 components), 75% tolerance matching, VM/Docker detection, RSA-signed license files (PSS padding), TPM sealing, cloud verification, offline grace periods, device review workflow for hardware changes.
- **Weak points:** Subprocess PATH injection risk, HS256 fallback weakens RS256.
- **Verdict:** Best-in-class anti-piracy implementation with advanced features (TPM, environment detection, component matching).

## Performance Review

- Fingerprint collection involves subprocess calls (up to 5+) — avoid calling on every request.
- Results are cached via `get_active_environment()` per process — good.
- `get_cached_license_status` caches in Redis with 30-minute TTL — good.

## Maintainability

- Well-structured with clear sections (fingerprinting, VM detection, RSA, validation).
- Well-named functions with docstrings.
- Long file (793 lines) but logically organized.

## Architecture Review

- License system is robust with multiple layers: file-based + DB + cloud + TPM.
- Environment-aware behavior (VM gets shorter grace, fewer binding components) is an advanced feature.
- The 75% component matching with device review workflow balances security and usability.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 9/10 |
| Security | 9/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 9/10 |
