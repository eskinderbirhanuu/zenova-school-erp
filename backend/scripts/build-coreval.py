"""
C extension builder for core license validation.
Compiles coreval.c into .pyd (Windows) or .so (Linux).
"""
import os
import sys
import platform
import subprocess
import tempfile
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
SOURCE_DIR = PROJECT_DIR / "app" / "licensing"
SOURCE_FILE = SOURCE_DIR / "coreval.c"
EMBEDDED_KEY = SOURCE_DIR / "embedded_key.h"
TARGET_DIR = SOURCE_DIR
PUBLIC_KEY_PATH = PROJECT_DIR / "keys" / "license_public.pem"

PG_OPENSSL_INCLUDE = r"C:\Program Files\PostgreSQL\16\include"
PG_OPENSSL_LIB = r"C:\Program Files\PostgreSQL\16\lib\libcrypto.lib"

# MSVC paths
MSVC_BASE = Path(r"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools")
MSVC_TOOLS = MSVC_BASE / "VC" / "Tools" / "MSVC"
V60 = 14.44  # adjust based on your installation
VCVARS64 = MSVC_BASE / "VC" / "Auxiliary" / "Build" / "vcvars64.bat"

# Python
import sysconfig
PYTHON_INC = sysconfig.get_path("include")
PYLIB_NAME = f"python{sys.version_info.major}{sys.version_info.minor}.lib"
PYTHON_LIB = Path(sysconfig.get_config_var("LIBDIR")) / PYLIB_NAME


def find_msvc_version() -> str:
    if MSVC_TOOLS.exists():
        versions = sorted(MSVC_TOOLS.iterdir(), reverse=True)
        if versions:
            return versions[0].name
    return "14.44.35207"


def write_embedded_key():
    pem = PUBLIC_KEY_PATH.read_bytes().decode().strip()
    lines = pem.split("\n")
    body = "\\n\\\n".join(lines)
    macro = f'#define PUBLIC_KEY_PEM "{body}\\n"\n'
    EMBEDDED_KEY.write_text(macro)
    print(f"Wrote {EMBEDDED_KEY}")


def build_windows():
    cl_ver = find_msvc_version()
    cl = MSVC_TOOLS / cl_ver / "bin" / "Hostx64" / "x64" / "cl.exe"
    output = TARGET_DIR / "coreval.pyd"

    if not cl.exists():
        print(f"MSVC compiler not found at {cl}")
        return False

    if not VCVARS64.exists():
        print(f"vcvars64.bat not found at {VCVARS64}")
        return False

    # Write a batch file that calls vcvars64.bat then cl.exe
    batch = f"""@echo off
call "{VCVARS64}" >nul 2>&1
"{{cl}}" /O2 /LD /nologo "{{source}}" /I"{{pg_inc}}" /I"{{py_inc}}" /I"{{src_dir}}" "{{pg_lib}}" "{{py_lib}}" /Fe"{{output}}"
"""
    batch = batch.format(
        cl=cl, source=SOURCE_FILE,
        pg_inc=PG_OPENSSL_INCLUDE, py_inc=PYTHON_INC, src_dir=SOURCE_DIR,
        pg_lib=PG_OPENSSL_LIB, py_lib=PYTHON_LIB, output=output
    )

    bat_path = Path(tempfile.gettempdir()) / "build_coreval.bat"
    bat_path.write_text(batch)

    print("Building with MSVC (via vcvars64)...")
    result = subprocess.run(
        str(bat_path),
        capture_output=True, text=True, shell=True
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        return False
    print(result.stdout)
    return True


def build_windows_mingw():
    gcc = "gcc"
    try:
        subprocess.run([gcc, "--version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("MinGW-w64 gcc not found")
        return False

    flags = [
        gcc,
        "-O2", "-fPIC", "-shared",
        "-o", str(TARGET_DIR / "coreval.pyd"),
        str(SOURCE_FILE),
        f"-I{PG_OPENSSL_INCLUDE}",
        f"-I{SOURCE_DIR}",
        PG_OPENSSL_LIB,
    ]
    print("Building with MinGW:", " ".join(flags))
    result = subprocess.run(flags, capture_output=True, text=True)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        return False
    print("STDOUT:", result.stdout)
    return True


def build_linux():
    gcc = "gcc"
    try:
        subprocess.run(["pkg-config", "--cflags", "--libs", "openssl"],
                       capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("openssl not found via pkg-config, trying direct link...")

    flags = [
        gcc,
        "-O2", "-fPIC", "-shared",
        "-o", str(TARGET_DIR / "coreval.so"),
        str(SOURCE_FILE),
        f"-I{SOURCE_DIR}",
    ]
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
    except (FileNotFoundError, subprocess.CalledProcessError):
        flags.extend(["-lcrypto", "-lssl"])

    print("Building with:", " ".join(flags))
    result = subprocess.run(flags, capture_output=True, text=True)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        return False
    print("STDOUT:", result.stdout)
    return True


def main():
    print("Building core validation C extension...")
    write_embedded_key()

    system = platform.system()
    ok = (
        build_windows() if system == "Windows"
        else build_linux() if system == "Linux"
        else False
    )

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
