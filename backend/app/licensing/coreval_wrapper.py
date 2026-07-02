"""
Wrapper around the compiled C validation extension.

If the C extension (coreval.pyd / coreval.so) is available, uses it for
anti-monkey-patch protection. Otherwise, falls back to pure Python.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_HAS_C_EXTENSION = False
_verify_lic_file_c = None

try:
    from app.licensing.coreval import verify_lic_file as _verify_lic_file_c
    _HAS_C_EXTENSION = True
    logger.info("C validation extension loaded (anti-monkey-patch active)")
except ImportError:
    logger.info("C extension not available — using pure Python validation")


def verify_lic_file(path: str) -> int:
    """Verify a .lic file. Returns 0 on success, -1 on failure."""
    if _HAS_C_EXTENSION:
        return _verify_lic_file_c(path)
    return _verify_lic_py(path)


def has_c_extension() -> bool:
    return _HAS_C_EXTENSION


def _verify_lic_py(path: str) -> int:
    """Pure-Python fallback."""
    try:
        import json, base64
        from app.services.license_crypto import verify_license_file
        with open(path) as f:
            lic_b64 = f.read().strip()
        result = verify_license_file(lic_b64)
        return 0 if result else -1
    except Exception:
        return -1
