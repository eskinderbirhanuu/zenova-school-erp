# File Reviewed

`backend/app/core/server_identity.py` (62 lines)

## Overview

Server identity management: generates unique server IDs, sync secrets, hardware fingerprints. Reads/writes `server_id.json` for deployment persistence. Used for license binding and sync authentication.

## Issues

### Issue 1 — Fingerprint Components Are Weakly Unique

- **Lines:** 25-34
- **Severity:** Medium
- **Category:** Security
- **Description:** The server fingerprint is derived from `platform.machine()`, `platform.processor()`, `platform.node()`, `uuid.getnode()`, and `socket.gethostname()`. These values can be spoofed or may be identical across cloned VMs.
- **Why it is a problem:** Cloned VMs (common in cloud/VMware environments) will have identical fingerprints. An attacker cloning a licensed VM can bypass the license binding.
- **Potential Impact:** License piracy via VM cloning.
- **Recommended Fix:** Include additional entropy sources: TPM (Trusted Platform Module) measurements, disk serial, network interface MAC (not just `getnode()`), and DMI/SMBIOS UUID.

### Issue 2 — `SERVER_ID_FILE` Path Uses `os.environ` Access at Module Level

- **Lines:** 11-14
- **Severity:** Low
- **Category:** Reliability
- **Description:** The path is computed at module import time using `os.environ.get()`. If the environment variable is set after import, it's ignored.
- **Why it is a problem:** Import order dependencies — if another module calls `os.environ['SERVER_ID_FILE']` after importing, the path is already frozen.
- **Potential Impact:** Inconsistent path resolution in edge cases.
- **Recommended Fix:** Lazily compute the path in a function, not at module level.

### Issue 3 — `sync_secret` Generated on Every `save_server_identity` Call

- **Line:** 47
- **Severity:** Low
- **Category:** Functionality
- **Description:** Every call to `save_server_identity` generates a new `sync_secret`. This would invalidate the previous secret, potentially breaking active sync connections.
- **Why it is a problem:** If `save_server_identity` is called to update only the role or school_id, the sync secret changes, and all sync clients will be rejected.
- **Potential Impact:** Sync disruption after identity updates.
- **Recommended Fix:** Only generate a new `sync_secret` if it doesn't already exist in the current identity file.

### Issue 4 — No Atomic Write for `server_id.json`

- **Line:** 57
- **Severity:** Low
- **Category:** Reliability
- **Description:** Uses `path.write_text()` which is not atomic. If the process crashes during write, the file could be partially written.
- **Why it is a problem:** A corrupted `server_id.json` could make the server unidentifiable after a crash, potentially invalidating the license.
- **Potential Impact:** License invalidation after crash during identity save.
- **Recommended Fix:** Write to a temporary file first, then `os.rename()` (atomic on most filesystems).

## Security Review

- **Strong points:** Server identity is persisted to disk, includes fingerprint for license binding, sync secret for HMAC authentication.
- **Weak points:** Fingerprint lacks TPM/disk serial sources. Cloned VMs share fingerprints.
- **Verdict:** Functional for basic scenarios, but anti-cloning protection could be stronger.

## Performance Review

- All operations are local file I/O — no performance concerns.

## Maintainability

- Clean functions with clear responsibilities.
- Well-named functions (`generate_server_id`, `generate_fingerprint`, `get_server_identity`).

## Architecture Review

- Server identity is a cross-cutting concern with implications for licensing, sync, and deployment.
- The file-based persistence is appropriate for single-server deployments.
- For HA/multi-server deployments, identity should be derived from a shared configuration source.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 7/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 7/10 |
