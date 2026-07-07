"""
TPM-based key sealing for hardware-bound license storage.

Provides:
  - TPM availability detection (Windows + Linux)
  - Seal/unseal with TPM when available
  - Software-based fallback using machine fingerprint

The TPM seals data to the current machine, so sealed data cannot be
decrypted on any other machine — even with the same .lic file.
"""

import hashlib
import logging
import os
import platform
import subprocess
import base64
from typing import Optional

logger = logging.getLogger(__name__)

_TPM_AVAILABLE: Optional[bool] = None


def is_tpm_available() -> bool:
    """Detect if a TPM 2.0 module is available on this system."""
    global _TPM_AVAILABLE
    if _TPM_AVAILABLE is not None:
        return _TPM_AVAILABLE

    system = platform.system()
    available = False

    try:
        if system == "Linux":
            available = (
                os.path.exists("/dev/tpm0") or
                os.path.exists("/dev/tpmrm0")
            )
            if not available:
                result = subprocess.run(
                    ["which", "tpm2_createprimary"],
                    capture_output=True, text=True, timeout=5,
                )
                available = result.returncode == 0
        elif system == "Windows":
            result = subprocess.run(
                ["powershell", "-Command",
                 "Get-WmiObject -Namespace 'Root\\CIMv2\\Security\\MicrosoftTpm' -Class Win32_Tpm | Select-Object -ExpandProperty IsEnabled_InitialValue"],
                capture_output=True, text=True, timeout=10,
            )
            available = result.returncode == 0 and result.stdout.strip() == "True"
    except Exception:
        available = False

    _TPM_AVAILABLE = available
    logger.info("TPM %s", "available" if available else "not detected")
    return available


def _get_machine_key() -> bytes:
    """Derive a software-based machine key as TPM fallback."""
    from app.services.license_crypto import get_machine_fingerprint
    raw = get_machine_fingerprint()
    return hashlib.pbkdf2_hmac("sha256", raw.encode(), b"zenova-tpm-fallback", 100000, 32)


def _tpm_seal(data: bytes) -> Optional[bytes]:
    """Seal data using TPM 2.0."""
    system = platform.system()
    try:
        if system == "Linux":
            result = subprocess.run(
                ["tpm2_createprimary", "-C", "o", "-g", "sha256", "-G", "rsa2048"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return None

            b64_data = base64.b64encode(data).decode()
            result = subprocess.run(
                ["tpm2_createpolicy", "--policy-pcr", "-l", "sha256:0,1,2,3,7", "-L", "/tmp/zenova_policy.dat"],
                capture_output=True, text=True, timeout=30,
            )
            result = subprocess.run(
                ["sh", "-c", f"echo '{b64_data}' | tpm2_create --policy-file /tmp/zenova_policy.dat -i- -u /tmp/zenova_key.pub -r /tmp/zenova_key.priv -C o"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return None

            result = subprocess.run(
                ["tpm2_load", "-C", "o", "-u", "/tmp/zenova_key.pub", "-r", "/tmp/zenova_key.priv", "-c", "/tmp/zenova_key.ctx"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return None

            result = subprocess.run(
                ["tpm2_evictcontrol", "-C", "o", "-c", "/tmp/zenova_key.ctx", "0x81000001"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return None

            result = subprocess.run(
                ["tpm2_encryptdecrypt", "-c", "0x81000001", "-o", "/tmp/zenova_sealed.bin"],
                capture_output=True, text=True, timeout=30, input=data,
            )
            if result.returncode != 0:
                return None

            with open("/tmp/zenova_sealed.bin", "rb") as f:
                sealed = f.read()
            return sealed

        elif system == "Windows":
            import ctypes
            from ctypes import wintypes

            try:
                tpm = ctypes.windll.tpmvscmgr
                return None
            except AttributeError:
                return None
    except Exception:
        return None
    return None


def _tpm_unseal(sealed: bytes) -> Optional[bytes]:
    """Unseal data using TPM 2.0."""
    system = platform.system()
    try:
        if system == "Linux":
            with open("/tmp/zenova_sealed_in.bin", "wb") as f:
                f.write(sealed)
            result = subprocess.run(
                ["tpm2_encryptdecrypt", "-c", "0x81000001", "-d", "-i", "/tmp/zenova_sealed_in.bin", "-o", "/tmp/zenova_unsealed.bin"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return None
            with open("/tmp/zenova_unsealed.bin", "rb") as f:
                data = f.read()
            return data
    except Exception:
        return None
    return None


def seal_license_data(data: str) -> str:
    """
    Seal sensitive license data (e.g., private key or fingerprint)
    to the current machine. Uses TPM when available, software fallback otherwise.

    Returns base64-encoded sealed data with a version prefix.
    """
    data_bytes = data.encode() if isinstance(data, str) else data

    if is_tpm_available():
        sealed = _tpm_seal(data_bytes)
        if sealed:
            logger.info("License data sealed with TPM (%d bytes)", len(sealed))
            return "tpm1:" + base64.b64encode(sealed).decode()

    key = _get_machine_key()
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend

    nonce = os.urandom(12)
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(data_bytes) + encryptor.finalize()

    result = base64.b64encode(nonce + encryptor.tag + ciphertext).decode()
    logger.info("License data sealed with software AES-GCM")
    return "sw1:" + result


def unseal_license_data(sealed: str) -> Optional[str]:
    """
    Unseal previously sealed license data.
    Returns original data as string, or None if unsealing fails.
    """
    if not sealed or ":" not in sealed:
        return None

    prefix, payload = sealed.split(":", 1)

    if prefix == "tpm1":
        sealed_bytes = base64.b64decode(payload)
        data = _tpm_unseal(sealed_bytes)
        if data:
            return data.decode()
        logger.warning("TPM unseal failed — machine may have changed")
        return None

    if prefix == "sw1":
        key = _get_machine_key()
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend

        raw = base64.b64decode(payload)
        nonce, tag, ciphertext = raw[:12], raw[12:28], raw[28:]
        try:
            cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag), backend=default_backend())
            decryptor = cipher.decryptor()
            data = decryptor.update(ciphertext) + decryptor.finalize()
            return data.decode()
        except Exception:
            logger.warning("Software unseal failed — machine fingerprint mismatch")
            return None

    return None
