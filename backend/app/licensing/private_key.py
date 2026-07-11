"""
ZENOVA License Signing Private Key loader.

Reads the RSA-2048 private key from the LICENSE_PRIVATE_KEY environment variable
(base64-encoded PEM). Falls back to reading from backend/keys/license_private.pem
for local development.
"""
import base64
import logging
import os

logger = logging.getLogger(__name__)

_PRIVATE_KEY_CACHE: str | None = None


def get_license_private_key() -> str:
    """Return the RSA private key PEM string.

    Priority:
    1. LICENSE_PRIVATE_KEY env var (base64-encoded PEM)
    2. backend/keys/license_private.pem file (dev fallback)
    """
    global _PRIVATE_KEY_CACHE
    if _PRIVATE_KEY_CACHE:
        return _PRIVATE_KEY_CACHE

    env_key = os.environ.get("LICENSE_PRIVATE_KEY")
    if env_key:
        try:
            _PRIVATE_KEY_CACHE = base64.b64decode(env_key).decode("utf-8")
            return _PRIVATE_KEY_CACHE
        except Exception:
            logger.warning("LICENSE_PRIVATE_KEY is not valid base64; falling back to file")

    # Dev fallback — file is gitignored
    here = os.path.dirname(os.path.abspath(__file__))
    fallback = os.path.join(here, "..", "..", "keys", "license_private.pem")
    if os.path.exists(fallback):
        with open(fallback) as f:
            _PRIVATE_KEY_CACHE = f.read()
            return _PRIVATE_KEY_CACHE

    raise RuntimeError(
        "No license private key found. "
        "Set LICENSE_PRIVATE_KEY env var (base64 of PEM) "
        "or place license_private.pem in backend/keys/"
    )
