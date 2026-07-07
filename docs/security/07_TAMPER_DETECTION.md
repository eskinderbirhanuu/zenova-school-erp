# Tamper Detection

## Overview

Tamper detection ensures the ZENOVA system has not been modified, patched, or compromised. It covers binaries, containers, configuration files, and runtime behavior. Upon detecting tampering, the system automatically enters a restricted mode or disables the license.

## Current State

| Protection | Status | Detail |
|-----------|--------|--------|
| C extension (coreval.c) | ⚠️ Source exists, not compiled | Would detect license file tampering |
| License file RSA signature | ✅ Implemented | Detects .lic file modification |
| File hash verification | ❌ Not implemented | No startup file integrity check |
| Container integrity | ❌ Not implemented | No Docker hash comparison |
| Runtime integrity | ❌ Not implemented | No self-check during operation |
| Configuration tampering | ❌ Not implemented | No .env modification detection |

## Tamper Detection Layers

### Layer 1 — License File Integrity (Existing)

```python
# At startup, app checks:
# 1. Does .lic file exist?
# 2. Is RSA-PSS signature valid?
# 3. Has hardware fingerprint changed?
# 4. Has license expired?
# 5. Is cloud validation OK? (falls to 45d grace)
```

### Layer 2 — File Integrity Monitor (FIM)

**What to monitor:**

| File/Directory | Why | Check Frequency |
|---------------|-----|-----------------|
| `app/` | Core business logic | Every startup |
| `.env` | Configuration | Every startup |
| `app/licensing/` | License validation code | Every startup |
| `app/core/security.py` | Auth logic | Every startup |
| `docker-compose.yml` | Deployment config | Every startup |

**Implementation:**

```python
# core/integrity.py
import hashlib
import json
from pathlib import Path

KNOWN_HASHES_FILE = "/app/data/.file_hashes.json"

def compute_file_hash(path: str) -> str:
    """Compute SHA-256 hash of a file."""
    with open(path, 'rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def record_known_hashes():
    """Run during initial deployment or after approved updates."""
    hashes = {}
    for pattern in FILE_PATTERNS:
        for f in Path().glob(pattern):
            if f.is_file():
                hashes[str(f)] = compute_file_hash(str(f))
    Path(KNOWN_HASHES_FILE).write_text(json.dumps(hashes, indent=2))

def verify_file_integrity() -> list[str]:
    """Compare current file hashes against known good hashes."""
    if not Path(KNOWN_HASHES_FILE).exists():
        return []  # First run — record and skip
    known = json.loads(Path(KNOWN_HASHES_FILE).read_text())
    violations = []
    for path, known_hash in known.items():
        if Path(path).exists():
            current_hash = compute_file_hash(path)
            if current_hash != known_hash:
                violations.append(f"Hash mismatch: {path}")
    return violations

def startup_integrity_check():
    """Run at app startup. If violations found, log and restrict."""
    violations = verify_file_integrity()
    if violations:
        log_audit("TAMPER_DETECTED", details={"violations": violations})
        # Enter restricted mode
        set_restricted_mode(True)
        return False
    return True
```

### Layer 3 — Container Integrity

**Docker Image Hash Verification:**

```bash
# At deployment, record image digest
IMAGE_DIGEST=$(docker inspect zenova/backend:latest --format '{{.Id}}')

# At startup, verify
CURRENT_DIGEST=$(docker inspect zenova/backend:latest --format '{{.Id}}')
if [ "$CURRENT_DIGEST" != "$IMAGE_DIGEST" ]; then
    echo "Container tampered!"
    exit 1
fi
```

**Docker Content Trust (DCT):**
```bash
# Enable DCT — only signed images can run
export DOCKER_CONTENT_TRUST=1

# Verify before pulling
docker trust inspect zenova/backend:latest --pretty
```

### Layer 4 — Runtime Python Monkey-Patch Detection

```python
# core/tamper_detect.py
import sys
import types

def detect_module_tampering():
    """Detect if critical modules have been monkey-patched."""
    critical_modules = [
        'app.services.license_validator',
        'app.services.license_crypto',
        'app.core.security',
    ]
    
    for mod_name in critical_modules:
        if mod_name in sys.modules:
            module = sys.modules[mod_name]
            # Check if module is our compiled C extension
            if hasattr(module, '__file__') and module.__file__:
                # Verify module hasn't been replaced with a modified version
                pass  # Implement specific checks per module

def verify_critical_function(module, func_name, expected_hash):
    """Verify a function's bytecode hash hasn't changed."""
    func = getattr(module, func_name, None)
    if func is None:
        return False
    # Get bytecode
    if hasattr(func, '__code__'):
        code_hash = hashlib.sha256(func.__code__.co_code).hexdigest()
        return code_hash == expected_hash
    return False
```

### Layer 5 — Startup Validation Chain

```
1. OS launches Python/Docker
2. coreval.c (.pyd) validates license file (C-level, anti monkey-patch)
3. If coreval fails → exit immediately
4. Python imports integrity module
5. Integrity module checks file hashes
6. If hashes mismatch → log + restrict mode
7. Integrity module checks critical module bytecode
8. If bytecode mismatch → log + restrict mode
9. Normal startup proceeds
```

### Layer 6 — Periodic Runtime Checks

```python
# Scheduled task (every 6 hours)
from app.core.integrity import verify_file_integrity

def scheduled_tamper_check():
    violations = verify_file_integrity()
    if violations:
        log_audit("RUNTIME_TAMPER_DETECTED", details={"violations": violations})
        set_restricted_mode(True)
        notify_super_admin("Tamper detected", violations)
```

## Response to Tampering

| Severity | Detection | Response |
|----------|-----------|----------|
| Critical | coreval.c exits with -1 | App shuts down immediately |
| High | File hash mismatch | Enter read-only mode, notify Super Admin |
| Medium | Bytecode change detected | Log audit, flag for review |
| Low | Unusual import path | Log, increase monitoring |

### Restricted Mode
```
When tamper detected:
  → All mutation endpoints return 403
  → License status set to SUSPENDED
  → Super Admin notified via Telegram/Email
  → Every API response includes X-Zenova-Tamper header
  → Audit log entry created
  → 30-day countdown before permanent lock
```

## Implementation Plan

### Phase 1 (3 days)
1. Compile coreval.c to .pyd/.so
2. Implement basic file integrity monitoring
3. Create known-hashes database on first deployment

### Phase 2 (3 days)
4. Add runtime monkey-patch detection
5. Implement container integrity checks
6. Build tamper response system (restricted mode)

### Phase 3 (2 days)
7. Add periodic integrity checks (background task)
8. Implement Super Admin notification on tamper
9. Create tamper event dashboard

## Rollback Instructions

- Disable integrity check: `set INTEGRITY_CHECK_ENABLED=false`
- Reset known hashes: Delete `/app/data/.file_hashes.json` and restart
- Revert restricted mode: Super Admin endpoint `POST /admin/clear-restricted`
