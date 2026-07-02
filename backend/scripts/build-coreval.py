"""
C extension builder for core license validation.

Compiles the C validation module into a .pyd (Windows) or .so (Linux)
so that critical license checks cannot be monkey-patched at Python level.

Requirements:
    - Windows: MinGW-w64 (gcc) or MSVC
    - Linux: gcc + libssl-dev

Usage:
    python scripts/build-coreval.py

Output:
    app/licensing/coreval.pyd   (Windows)
    app/licensing/coreval.so    (Linux)
"""
import os
import sys
import platform
import subprocess
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
SOURCE_DIR = PROJECT_DIR / "app" / "licensing"
SOURCE_FILE = SOURCE_DIR / "coreval.c"
TARGET_DIR = SOURCE_DIR

# Embed the public key into the C source at build time
PUBLIC_KEY_PATH = PROJECT_DIR / "keys" / "license_public.pem"


def embed_public_key() -> str:
    """Read the PEM public key and format as a C string literal."""
    pem = PUBLIC_KEY_PATH.read_bytes()
    lines = pem.decode().strip().split("\n")
    escaped = "\\n\\\n".join(lines)
    return f'"' + escaped + '\\n"'


def build_windows():
    """Build with MinGW-w64 gcc."""
    gcc = "gcc"
    try:
        subprocess.run([gcc, "--version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("ERROR: MinGW-w64 gcc not found in PATH.")
        print("Install from: https://www.mingw-w64.org/")
        return False

    pubkey_str = embed_public_key()
    flags = [
        gcc,
        "-O2", "-fPIC", "-shared",
        "-o", str(TARGET_DIR / "coreval.pyd"),
        str(SOURCE_FILE),
        "-I/usr/include", "-I/mingw64/include",
        "-lcrypto", "-lssl",
        f'-DPUBLIC_KEY_PEM={pubkey_str}',
    ]
    print("Building with:", " ".join(flags))
    result = subprocess.run(flags, capture_output=True, text=True)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        return False
    print("STDOUT:", result.stdout)
    return True


def build_linux():
    """Build with gcc + openssl."""
    gcc = "gcc"
    try:
        subprocess.run(["pkg-config", "--cflags", "--libs", "openssl"],
                       capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("WARNING: openssl not found via pkg-config, trying direct link...")

    pubkey_str = embed_public_key()
    flags = [
        gcc,
        "-O2", "-fPIC", "-shared",
        "-o", str(TARGET_DIR / "coreval.so"),
        str(SOURCE_FILE),
    ]
    # Try pkg-config first
    try:
        cflags = subprocess.run(
            ["pkg-config", "--cflags", "openssl"],
            capture_output=True, text=True, check=True
        ).stdout.strip().split()
        libs = subprocess.run(
            ["pkg-config", "--libs", "openssl"],
            capture_output=True, text=True, check=True
        ).stdout.strip().split()
        flags.extend(cflags)
        flags.extend(libs)
        flags.append(f'-DPUBLIC_KEY_PEM={pubkey_str}')
    except (FileNotFoundError, subprocess.CalledProcessError):
        flags.extend(["-lcrypto", "-lssl"])
        flags.append(f'-DPUBLIC_KEY_PEM={pubkey_str}')

    print("Building with:", " ".join(flags))
    result = subprocess.run(flags, capture_output=True, text=True)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        return False
    print("STDOUT:", result.stdout)
    return True


def main():
    print("Building core validation C extension...")
    system = platform.system()
    if system == "Windows":
        ok = build_windows()
    elif system == "Linux":
        ok = build_linux()
    else:
        print(f"Unsupported platform: {system}")
        ok = False

    if ok:
        ext = ".pyd" if system == "Windows" else ".so"
        output = TARGET_DIR / f"coreval{ext}"
        if output.exists():
            print(f"SUCCESS: Built {output} ({output.stat().st_size} bytes)")
        else:
            print(f"WARNING: Build completed but {output} not found")
    else:
        print("FAILED: Could not build C extension")
        print("The system will fall back to pure-Python validation.")
        sys.exit(1)


if __name__ == "__main__":
    main()
