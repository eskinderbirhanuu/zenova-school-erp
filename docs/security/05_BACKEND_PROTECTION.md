# Backend Protection

## Overview

Raw Python source code is easily readable, modifiable, and redistributable. To protect ZENOVA's intellectual property, the backend code must be compiled to native binaries, obfuscated, or both — making reverse engineering significantly more expensive than the value of a license.

## Current State

**Raw Python files ship in Docker images:**
```
/app/
  ├── app/
  │   ├── main.py              ← Plain text
  │   ├── database.py
  │   ├── config.py            ← Configuration logic
  │   ├── models/              ← 52+ ORM models
  │   ├── api/v1/endpoints/    ← 40 endpoint files
  │   ├── services/            ← Business logic
  │   ├── core/                ← Auth, permissions
  │   └── utils/
  ├── requirements.txt
  └── alembic/
```

**Anyone with Docker access can:**
- Read all source code
- Modify business logic
- Remove license checks
- Extract and redistribute

## Compilation Options

### Option A — Nuitka (Recommended)

**Pros:**
- Compiles Python to C then to native binary
- Supports most Python features
- Produces standalone executable or module
- Free and open source
- Active maintenance

**Cons:**
- Some dynamic features break (eval, exec)
- Build time can be long (5-30 min)
- Larger binary size (15-50 MB)
- Incomplete support for some packages

```bash
# Install
pip install nuitka

# Compile to standalone folder
python -m nuitka --standalone \
    --enable-plugin=multiprocessing \
    --enable-plugin=numpy \
    --follow-import-to=app \
    --output-dir=dist \
    app/main.py

# Compile to single executable (experimental)
python -m nuitka --onefile \
    --enable-plugin=multiprocessing \
    --output-dir=dist \
    app/main.py
```

### Option B — PyInstaller

**Pros:**
- Mature and widely used
- Excellent library support
- Produces single-file executable or folder
- Cross-platform

**Cons:**
- Bundles Python interpreter (detectable)
- Easier to reverse than Nuitka
- Larger file size

```bash
pip install pyinstaller
pyinstaller --onefile --name zenova-server app/main.py
```

### Option C — Cython Compilation

**Pros:**
- Compiles Python to C extension modules
- Good performance improvement
- Hides source code
- Compatible with standard Python tooling

**Cons:**
- Requires type annotations for best results
- Complex build process for large projects
- Partial coverage

```python
# setup.py
from Cython.Build import cythonize
from setuptools import setup, find_packages

setup(
    name='zenova',
    ext_modules=cythonize(
        'app/**/*.py',
        compiler_directives={
            'language_level': '3',
            'binding': False,
        }
    ),
)
```

### Option D — PyArmor (Obfuscation)

**Pros:**
- Obfuscates bytecode, not source
- Runtime protection (anti-debug, anti-dump)
- License binding (bind to specific machine)
- Easy to apply (no build process change)

**Cons:**
- Commercial license required
- Performance overhead (~10-30%)
- Not true compilation (still needs Python)

```bash
pip install pyarmor
pyarmor obfuscate -r app/
```

## Recommendation: Hybrid Approach

```
Layer 1 — C Extension (coreval.c → .pyd)
  Anti-tamper: validates license file signature
  Compiled with: gcc/MinGW + OpenSSL
  Ships: coreval.pyd in site-packages

Layer 2 — PyArmor Obfuscation
  Obfuscate: app/ (all business logic)
  Preserves: import structure, function names
  License binding: optional PyArmor license

Layer 3 — Nuitka Compilation (Optional)
  For distribution to untrusted environments
  One-file executable
  Removes need for Python runtime

Layer 4 — coreval Integrity Check
  Python startup imports coreval
  coreval validates own checksum
  coreval validates license file signature
  Any tampering → coreval returns -1 → app exits
```

## C Extension Compilation (coreval.c → .pyd)

### Prerequisites
```bash
# Linux
sudo apt-get install gcc libssl-dev python3-dev

# Windows (MinGW)
choco install mingw
# Or install Visual Studio Build Tools
```

### Build Script (existing: `scripts/build-coreval.py`)
```python
"""
Builds coreval.c into a Python extension (.pyd/.so).
Embeds RSA public key at compile time.
"""
import sys
import subprocess
from pathlib import Path

def build_extension():
    public_key = Path("licensing/public_key.py").read_text()
    # Extract PEM from Python file
    pem = extract_pem(public_key)
    
    if sys.platform == "win32":
        compiler = "gcc"
        libs = ["-lssl", "-lcrypto", "-lpython3"]
        output = "licensing/coreval.pyd"
    else:
        compiler = "gcc"
        libs = ["-lssl", "-lcrypto", "-lpython3.12"]
        output = "licensing/coreval.so"
    
    subprocess.run([
        compiler, "-shared", "-fPIC",
        "-DPUBLIC_KEY_PEM=\"" + pem.replace('"', '\\"') + "\"",
        "-o", output,
        "licensing/coreval.c",
        *libs,
        "-I", sys.prefix + "/include/python3.12",
    ])

if __name__ == "__main__":
    build_extension()
```

### Expected Output
- `licensing/coreval.pyd` (Windows) — 50-100 KB
- `licensing/coreval.so` (Linux) — 50-100 KB

## Implementation Plan

### Phase 1 (2 days)
1. Compile `coreval.c` to `.pyd`/`.so`
2. Verify `coreval_wrapper.py` correctly loads compiled version
3. Add fallback logging when pure-Python path is used

### Phase 2 (3 days)
4. Apply PyArmor obfuscation to `app/` directory
5. Test all endpoints with obfuscated code
6. Create Docker build stage for obfuscation

### Phase 3 (5 days — optional)
7. Evaluate Nuitka compilation for backend
8. Create multi-stage Docker build with Nuitka
9. Test compiled binary in production-like environment

## Key Files Protection

### Critical Files to Protect
| File | Risk | Protection |
|------|------|------------|
| `app/config.py` | Exposes architecture | Obfuscate + compile |
| `app/core/security.py` | Auth logic | Obfuscate + compile |
| `app/services/license_service.py` | License check code | Compile to .pyd |
| `app/services/license_crypto.py` | Crypto operations | Compile to .pyd |
| `app/models/` | Database schema | Obfuscate |
| `app/api/v1/endpoints/` | Business logic | Obfuscate |

## Rollback Instructions

- Revert to source: Replace compiled `.pyd` with original `.py`
- Disable C extension: Restart with `USE_COREVAL=0` env var
- Remove PyArmor: `pip uninstall pyarmor` and copy original `.py` files back
