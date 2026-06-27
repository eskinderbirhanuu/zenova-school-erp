import hashlib
import json
import os
import platform
import subprocess
import base64
from datetime import datetime, timedelta
from typing import Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.license import License, LicenseStatus
from app.core.redis_client import get_redis


# ─── Machine Fingerprinting ───────────────────────────────

def get_machine_fingerprint() -> str:
    components = []

    # MAC address
    try:
        if platform.system() == "Linux":
            for iface in ["eth0", "enp0s3", "enp0s8", "ens33", "enx*"]:
                path = f"/sys/class/net/{iface}/address"
                if os.path.exists(path):
                    with open(path) as f:
                        addr = f.read().strip()
                        if addr and addr != "00:00:00:00:00:00":
                            components.append(addr)
                            break
        else:
            import uuid
            components.append(str(uuid.getnode()))
    except Exception:
        components.append("no-mac")

    # CPU info
    try:
        if platform.system() == "Linux" and os.path.exists("/proc/cpuinfo"):
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "Serial" in line:
                        components.append(line.split(":")[1].strip())
                        break
    except Exception:
        pass

    # Machine ID
    try:
        if os.path.exists("/etc/machine-id"):
            with open("/etc/machine-id") as f:
                components.append(f.read().strip())
        elif os.path.exists("/var/lib/dbus/machine-id"):
            with open("/var/lib/dbus/machine-id") as f:
                components.append(f.read().strip())
    except Exception:
        components.append("no-machine-id")

    # Disk serial
    try:
        if platform.system() == "Linux":
            result = subprocess.run(
                ["udevadm", "info", "--query=property", "--name=/dev/sda"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split("\n"):
                if "ID_SERIAL_SHORT" in line or "ID_SERIAL" in line:
                    components.append(line.split("=")[1])
                    break
    except Exception:
        pass

    raw = ":".join(components)
    return hashlib.sha256(raw.encode()).hexdigest()


def get_short_fingerprint() -> str:
    return get_machine_fingerprint()[:8]


# ─── RSA Key Management ───────────────────────────────────

def generate_key_pair() -> tuple[bytes, bytes]:
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


def create_license_file(
    school_id: str,
    school_name: str,
    machine_fingerprint: str,
    valid_until: str,
    private_key_pem: bytes,
) -> str:
    payload = {
        "school_id": school_id,
        "school_name": school_name,
        "machine_fingerprint": machine_fingerprint,
        "valid_until": valid_until,
        "created_at": datetime.utcnow().isoformat(),
    }
    payload_json = json.dumps(payload, separators=(",", ":"))

    private_key = serialization.load_pem_private_key(
        private_key_pem, password=None, backend=default_backend(),
    )
    signature = private_key.sign(
        payload_json.encode(),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
        hashes.SHA256(),
    )

    license_data = {
        "payload": payload,
        "signature": base64.b64encode(signature).decode(),
    }
    return base64.b64encode(
        json.dumps(license_data, separators=(",", ":")).encode()
    ).decode()


def verify_license_file(license_b64: str, public_key_pem: bytes) -> Optional[dict]:
    try:
        license_data = json.loads(base64.b64decode(license_b64))
        payload = license_data["payload"]
        signature = base64.b64decode(license_data["signature"])
        payload_json = json.dumps(payload, separators=(",", ":"))

        public_key = serialization.load_pem_public_key(
            public_key_pem, backend=default_backend(),
        )
        public_key.verify(
            signature,
            payload_json.encode(),
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
            hashes.SHA256(),
        )
        return payload
    except Exception:
        return None


# ─── License Validation ──────────────────────────────────

OFFLINE_GRACE_DAYS = 45


def _can_reach_license_server() -> bool:
    """Check if Super Admin license server is reachable."""
    import httpx
    try:
        resp = httpx.get(
            "https://license.zenovaerp.com/api/v1/license/ping",
            timeout=5,
        )
        return resp.status_code == 200
    except Exception:
        return False


def validate_license_at_startup(db: Session) -> dict:
    license_record = db.query(License).filter(
        License.status == LicenseStatus.ACTIVE,
    ).first()

    if not license_record:
        return {
            "valid": False,
            "restrict_nfc": True,
            "restrict_qr": True,
            "restrict_import": True,
            "restrict_id_card": True,
            "message": "No active license found",
        }

    # Check expiry
    if license_record.valid_until and license_record.valid_until < datetime.utcnow():
        license_record.status = LicenseStatus.EXPIRED
        db.commit()
        return {
            "valid": False,
            "restrict_nfc": True,
            "restrict_qr": True,
            "restrict_import": True,
            "restrict_id_card": True,
            "message": "License has expired",
        }

    # Check hardware binding
    if license_record.machine_fingerprint:
        current = get_machine_fingerprint()
        if license_record.machine_fingerprint != current:
            return {
                "valid": False,
                "restrict_nfc": True,
                "restrict_qr": True,
                "restrict_import": True,
                "restrict_id_card": True,
                "message": "Hardware fingerprint mismatch",
            }

    # Check offline grace period
    if not _can_reach_license_server():
        now = datetime.utcnow()
        if license_record.offline_grace_start is None:
            license_record.offline_grace_start = now
            db.commit()

        grace_days = (now - license_record.offline_grace_start).days
        if grace_days > OFFLINE_GRACE_DAYS:
            return {
                "valid": False,
                "restrict_nfc": True,
                "restrict_qr": True,
                "restrict_import": True,
                "restrict_id_card": True,
                "message": f"Offline grace period expired ({grace_days} days)",
            }

    return {
        "valid": True,
        "restrict_nfc": False,
        "restrict_qr": False,
        "restrict_import": False,
        "restrict_id_card": False,
        "message": "License is valid",
    }


def get_cached_license_status() -> dict:
    """Get license status from Redis cache (refreshed every 30 min)."""
    try:
        r = get_redis()
        cached = r.get("license:status")
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    db = SessionLocal()
    try:
        status = validate_license_at_startup(db)
        db.commit()
        try:
            r = get_redis()
            r.setex("license:status", 1800, json.dumps(status))
        except Exception:
            pass
        return status
    finally:
        db.close()


def invalidate_license_cache():
    try:
        r = get_redis()
        r.delete("license:status")
    except Exception:
        pass


def bind_license_to_hardware(db: Session, license_id: str):
    """Bind license to current machine hardware on first activation."""
    fingerprint = get_machine_fingerprint()
    lic = db.query(License).filter(License.id == license_id).first()
    if lic and not lic.machine_fingerprint:
        lic.machine_fingerprint = fingerprint
        db.commit()
        invalidate_license_cache()
