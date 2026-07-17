import hashlib
import json
import logging
import os
import platform
import subprocess
import base64
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.license import License, LicenseStatus
from app.core.redis_client import get_redis
from app.core.audit import log_audit
from app.core.constants import OFFLINE_GRACE_DAYS, FINGERPRINT_MATCH_THRESHOLD
from app.utils.circuit_breaker import CircuitBreaker


# ─── Machine Fingerprinting (8 components + 75% tolerance) ─

FINGERPRINT_COMPONENT_NAMES = [
    "mac",
    "cpu_serial",
    "machine_id",
    "disk_serial",
    "hostname",
    "os_version",
    "dmi_uuid",
    "boot_id",
]

# ─── VM / Container Detection ─────────────────────────────

KNOWN_HYPERVISOR_MAC_PREFIXES = [
    "00:05:69", "00:0c:29", "00:1c:14", "00:50:56",  # VMware
    "00:15:5d",                                         # Hyper-V
    "00:1e:0f", "00:21:f6",                             # VirtualBox
    "00:16:3e",                                         # Xen
    "02:42:ac",                                         # Docker
    "0a:00:27",                                         # VirtualBox (NAT)
    "00:03:ff",                                         # Microsoft Hyper-V
]

VM_DMI_PATTERNS = [
    "vmware", "virtualbox", "qemu", "kvm", "xen",
    "microsoft corporation", "bochs", "oracle corporation",
]


def detect_environment() -> str:
    """Detect if running in a VM, Docker container, or bare metal.

    Returns one of: 'docker', 'vm', 'bare_metal', 'unknown'.
    """
    system = platform.system()

    # Docker detection
    if system == "Linux":
        try:
            if os.path.exists("/proc/1/cgroup"):
                with open("/proc/1/cgroup") as f:
                    content = f.read()
                    if "docker" in content or "containerd" in content:
                        return "docker"
        except Exception:
            pass
        try:
            if os.path.exists("/.dockerenv"):
                return "docker"
        except Exception:
            pass

    # VM detection via DMI UUID
    try:
        if system == "Linux" and os.path.exists("/sys/class/dmi/id/product_uuid"):
            with open("/sys/class/dmi/id/product_uuid") as f:
                uuid_val = f.read().strip().lower()
                if any(vm in uuid_val for vm in VM_DMI_PATTERNS):
                    return "vm"
        elif system == "Windows":
            result = subprocess.run(
                ["wmic", "csproduct", "get", "UUID"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split("\n"):
                line = line.strip().lower()
                if line and line != "uuid":
                    if any(vm in line for vm in VM_DMI_PATTERNS):
                        return "vm"
    except Exception:
        pass

    # VM detection via MAC prefix
    try:
        if system == "Linux":
            for iface_name in os.listdir("/sys/class/net"):
                path = f"/sys/class/net/{iface_name}/address"
                if os.path.exists(path):
                    with open(path) as f:
                        addr = f.read().strip().lower()
                        if any(addr.startswith(p) for p in KNOWN_HYPERVISOR_MAC_PREFIXES):
                            return "vm"
        else:
            mac = str(uuid.getnode())
            mac_hex = f"{mac:012x}"
            mac_str = f"{mac_hex[0:2]}:{mac_hex[2:4]}:{mac_hex[4:6]}"
            if any(mac_str.startswith(p.replace(":", "")) for p in KNOWN_HYPERVISOR_MAC_PREFIXES):
                return "vm"
    except Exception:
        pass

    # VM detection via CPU flags
    if system == "Linux" and os.path.exists("/proc/cpuinfo"):
        try:
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "hypervisor" in line.lower():
                        return "vm"
        except Exception:
            pass

    return "bare_metal"


ENVIRONMENT_GRACE_DAYS = {
    "bare_metal": OFFLINE_GRACE_DAYS,
    "vm": 30,
    "docker": 15,
    "unknown": 7,
}

ENVIRONMENT_BINDING_COMPONENTS = {
    "bare_metal": FINGERPRINT_COMPONENT_NAMES,
    "vm": ["machine_id", "disk_serial"],
    "docker": ["machine_id"],
    "unknown": ["hostname", "mac"],
}


def get_active_environment() -> str:
    """Get detected environment, cached per process."""
    if not hasattr(get_active_environment, "_cached"):
        get_active_environment._cached = detect_environment()
    return get_active_environment._cached


def get_environment_grace_days(env: str | None = None) -> int:
    if env is None:
        env = get_active_environment()
    return ENVIRONMENT_GRACE_DAYS.get(env, 7)


def get_effective_fingerprint_components(env: str | None = None) -> dict:
    """Collect only the components relevant for the current environment."""
    if env is None:
        env = get_active_environment()
    keys = ENVIRONMENT_BINDING_COMPONENTS.get(env, FINGERPRINT_COMPONENT_NAMES)
    all_comp = _collect_fingerprint_components()
    return {k: all_comp.get(k, f"no-{k}") for k in keys}


def get_environment_fingerprint(env: str | None = None) -> str:
    """SHA-256 of only the environment-relevant fingerprint components."""
    comp = get_effective_fingerprint_components(env)
    keys = list(comp.keys())
    raw = ":".join(str(comp.get(k, "")) for k in keys)
    return hashlib.sha256(raw.encode()).hexdigest()


def _collect_fingerprint_components() -> dict:
    """Collect 8 hardware/software fingerprint components."""
    comp = {}
    system = platform.system()

    # 1. MAC address
    try:
        if system == "Linux":
            for iface_name in os.listdir("/sys/class/net"):
                path = f"/sys/class/net/{iface_name}/address"
                if os.path.exists(path):
                    with open(path) as f:
                        addr = f.read().strip()
                        if addr and addr != "00:00:00:00:00:00" and addr != "ff:ff:ff:ff:ff:ff":
                            comp["mac"] = addr
                            break
        else:
            comp["mac"] = str(uuid.getnode())
    except Exception:
        comp["mac"] = "no-mac"

    # 2. CPU serial
    try:
        if system == "Linux" and os.path.exists("/proc/cpuinfo"):
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "Serial" in line:
                        comp["cpu_serial"] = line.split(":")[1].strip()
                        break
    except Exception:
        pass
    if "cpu_serial" not in comp:
        comp["cpu_serial"] = "no-cpu-serial"

    # 3. Machine ID
    try:
        if os.path.exists("/etc/machine-id"):
            with open("/etc/machine-id") as f:
                comp["machine_id"] = f.read().strip()
        elif os.path.exists("/var/lib/dbus/machine-id"):
            with open("/var/lib/dbus/machine-id") as f:
                comp["machine_id"] = f.read().strip()
        elif system == "Windows":
            result = subprocess.run(
                ["wmic", "csproduct", "get", "UUID"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split("\n"):
                line = line.strip()
                if line and line != "UUID":
                    comp["machine_id"] = line
                    break
    except Exception:
        pass
    if "machine_id" not in comp:
        comp["machine_id"] = "no-machine-id"

    # 4. Disk serial
    try:
        if system == "Linux":
            result = subprocess.run(
                ["udevadm", "info", "--query=property", "--name=/dev/sda"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split("\n"):
                if "ID_SERIAL_SHORT" in line:
                    comp["disk_serial"] = line.split("=", 1)[1]
                    break
        elif system == "Windows":
            result = subprocess.run(
                ["wmic", "diskdrive", "get", "SerialNumber"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split("\n"):
                line = line.strip()
                if line and line != "SerialNumber":
                    comp["disk_serial"] = line
                    break
    except Exception:
        pass
    if "disk_serial" not in comp:
        comp["disk_serial"] = "no-disk-serial"

    # 5. Hostname
    try:
        comp["hostname"] = platform.node()
    except Exception:
        comp["hostname"] = "no-hostname"

    # 6. OS version
    try:
        comp["os_version"] = platform.platform()
    except Exception:
        comp["os_version"] = "no-os-version"

    # 7. DMI UUID (BIOS)
    try:
        if system == "Linux":
            paths = [
                "/sys/class/dmi/id/product_uuid",
                "/sys/class/dmi/id/board_serial",
            ]
            for p in paths:
                if os.path.exists(p):
                    with open(p) as f:
                        val = f.read().strip()
                        if val and val != "0" * len(val):
                            comp["dmi_uuid"] = val
                            break
        elif system == "Windows":
            result = subprocess.run(
                ["wmic", "csproduct", "get", "UUID"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split("\n"):
                line = line.strip()
                if line and line != "UUID":
                    comp["dmi_uuid"] = line
                    break
    except Exception:
        pass
    if "dmi_uuid" not in comp:
        comp["dmi_uuid"] = "no-dmi-uuid"

    # 8. Boot ID
    try:
        if system == "Linux" and os.path.exists("/proc/sys/kernel/random/boot_id"):
            with open("/proc/sys/kernel/random/boot_id") as f:
                comp["boot_id"] = f.read().strip()
        elif system == "Windows":
            result = subprocess.run(
                ["wmic", "os", "get", "LastBootUpTime"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split("\n"):
                line = line.strip()
                if line and line != "LastBootUpTime":
                    comp["boot_id"] = hashlib.sha256(line.encode()).hexdigest()[:16]
                    break
    except Exception:
        pass
    if "boot_id" not in comp:
        comp["boot_id"] = "no-boot-id"

    return comp


def get_machine_fingerprint() -> str:
    """SHA-256 hash of all 8 fingerprint components."""
    comp = _collect_fingerprint_components()
    raw = ":".join(str(comp.get(k, "")) for k in FINGERPRINT_COMPONENT_NAMES)
    return hashlib.sha256(raw.encode()).hexdigest()


def get_fingerprint_components() -> dict:
    """Return raw components (for debugging / display)."""
    return _collect_fingerprint_components()


def get_short_fingerprint() -> str:
    return get_machine_fingerprint()[:8]


def encode_hardware_components(components: dict) -> str:
    """Base64-encode the 8 hardware components for DB storage in hardware_id column."""
    return base64.b64encode(json.dumps(components, separators=(",", ":")).encode()).decode()


def decode_hardware_components(encoded: str) -> dict:
    """Decode stored hardware components from hardware_id column."""
    return json.loads(base64.b64decode(encoded))


def match_fingerprint_components(stored_components_b64: str, threshold: float = FINGERPRINT_MATCH_THRESHOLD) -> tuple:
    """Compare stored hardware components with current hardware.

    Uses the keys present in stored data (supports environment-reduced sets
    like VM with only machine_id+disk_serial, or Docker with only machine_id).
    Returns (is_match: bool, match_count: int, total: int).
    """
    stored = decode_hardware_components(stored_components_b64)
    current = _collect_fingerprint_components()
    keys = list(stored.keys())
    total = len(keys)
    if total == 0:
        return False, 0, 0
    matches = sum(1 for k in keys if stored.get(k) == current.get(k))
    ratio = matches / total
    return ratio >= threshold, matches, total


def match_hostname(pattern: str) -> bool:
    """Check if current hostname matches a pattern in the license.
    
    Supports:
      - Exact match: 'server-01'
      - Suffix wildcard: '*.mycompany.com'
      - Prefix wildcard: 'DESKTOP-*'
      - '*': matches any hostname (first activation fallback)
    """
    current = platform.node()
    if pattern == "*":
        return True
    if pattern.startswith("*."):
        return current.endswith(pattern[1:]) or current == pattern[2:]
    if pattern.endswith("*"):
        return current.startswith(pattern[:-1])
    return current == pattern


def match_fingerprint(stored_hash: str, threshold: float = FINGERPRINT_MATCH_THRESHOLD) -> bool:
    """Compare stored fingerprint hash with current hardware.
    
    Uses 75% tolerance: at least 6 of 8 components must match.
    If stored_hash is a full SHA-256 hash (legacy mode), falls back to exact match.
    """
    # Legacy mode: if stored is standard SHA-256 length, do exact match
    if len(stored_hash) == 64:
        current = get_machine_fingerprint()
        return stored_hash == current

    # Component-level matching
    stored_components = stored_hash.split(":")
    current_components = _collect_fingerprint_components()
    current_list = [str(current_components.get(k, "")) for k in FINGERPRINT_COMPONENT_NAMES]

    if len(stored_components) != len(current_list):
        return False

    matches = sum(1 for a, b in zip(stored_components, current_list) if a == b)
    ratio = matches / len(stored_components) if stored_components else 0
    return ratio >= threshold


# ─── RSA Key Management ───────────────────────────────────

from app.licensing.public_key import get_license_public_key
from app.licensing.private_key import get_license_private_key

LIC_FILE_PATHS = {
    "Linux": "/etc/zenova/license.lic",
    "Windows": "C:\\ProgramData\\Zenova\\license.lic",
    "Darwin": "/Library/Application Support/Zenova/license.lic",
}


def get_lic_file_path() -> str:
    return LIC_FILE_PATHS.get(platform.system(), LIC_FILE_PATHS["Linux"])


def create_license_file(
    school_id: str,
    school_name: str,
    machine_fingerprint: str,
    valid_until: str,
    private_key_pem: bytes | None = None,
) -> str:
    if private_key_pem is None:
        private_key_pem = get_license_private_key().encode()
    payload = {
        "version": 2,
        "school_id": school_id,
        "school_name": school_name,
        "machine_fingerprint": machine_fingerprint,
        "valid_until": valid_until,
        "created_at": datetime.now(timezone.utc).isoformat(),
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


def write_lic_file(license_b64: str, path: Optional[str] = None) -> str:
    """Write .lic file to the standard OS path (or custom path)."""
    dest = path or get_lic_file_path()
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w") as f:
        f.write(license_b64)
    return dest


def read_lic_file(path: Optional[str] = None) -> Optional[str]:
    """Read .lic file from the standard OS path (or custom path)."""
    lic_path = path or get_lic_file_path()
    if not os.path.exists(lic_path):
        return None
    with open(lic_path) as f:
        return f.read().strip()


def verify_license_file(
    license_b64: Optional[str] = None,
    public_key_pem: Optional[bytes] = None,
) -> Optional[dict]:
    if license_b64 is None:
        license_b64 = read_lic_file()
        if license_b64 is None:
            return None
    if public_key_pem is None:
        public_key = get_license_public_key()
    else:
        public_key = serialization.load_pem_public_key(
            public_key_pem, backend=default_backend(),
        )
    try:
        license_data = json.loads(base64.b64decode(license_b64))
        payload = license_data["payload"]
        signature = base64.b64decode(license_data["signature"])
        payload_json = json.dumps(payload, separators=(",", ":"))
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

_license_server_breaker = CircuitBreaker("license_server", failure_threshold=3, recovery_timeout=60)


def _can_reach_license_server() -> bool:
    """Check if Super Admin license server is reachable."""

    def _ping():
        import httpx
        from app.config import settings
        resp = httpx.get(
            f"{settings.license_server_url}/api/v1/license/ping",
            timeout=5,
        )
        if resp.status_code != 200:
            raise ConnectionError(f"License server ping returned {resp.status_code}")
        return True

    import httpx
    try:
        return _license_server_breaker.call(_ping)
    except Exception:
        return False


def _verify_cloud_license(key: str, fingerprint: str, tpm_sealed: str | None = None,
                           environment: str | None = None) -> dict:
    """Verify license against cloud license server."""

    def _verify():
        import httpx
        from app.config import settings
        payload = {
            "key": key,
            "machine_fingerprint": fingerprint,
            "tpm_sealed": tpm_sealed,
            "environment": environment or get_active_environment(),
        }
        resp = httpx.post(
            f"{settings.license_server_url}/api/v1/license/verify",
            json=payload,
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
        raise ConnectionError(f"Cloud server returned {resp.status_code}")

    try:
        return _license_server_breaker.call(_verify)
    except Exception as e:
        return {"valid": False, "message": str(e)}


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
    if license_record.valid_until and license_record.valid_until < datetime.now(timezone.utc):
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

    # TPM-enhanced verification — if TPM sealed data exists, unseal and verify
    if license_record.tpm_sealed_data:
        try:
            from app.services.tpm_service import unseal_license_data, is_tpm_available
            if is_tpm_available():
                unsealed = unseal_license_data(license_record.tpm_sealed_data)
                if not unsealed:
                    logger.warning("TPM unseal failed — hardware may have changed at TPM level")
                    log_audit(
                        db, "system", "HW_MISMATCH", "licenses",
                        license_record.id,
                        description="TPM unseal failed — machine may have changed",
                        school_id=license_record.school_id,
                    )
        except Exception:
            pass

    # Check hardware binding — use 75% component-level matching when available
    if license_record.machine_fingerprint:
        if license_record.hardware_id:
            is_match, match_count, total = match_fingerprint_components(license_record.hardware_id)
            if is_match:
                if match_count < total:
                    log_audit(
                        db, "system", "HW_MINOR_CHANGE", "licenses",
                        license_record.id,
                        description=f"Hardware change detected — {match_count}/{total} components matched (auto-approved)",
                        school_id=license_record.school_id,
                    )
            else:
                logger.warning(
                    "Hardware fingerprint mismatch: %d/%d components matched",
                    match_count, total,
                )
                # Route through device review workflow
                from app.services.device_review_service import create_device_change_request
                change_req = create_device_change_request(
                    db, license_record, license_record.hardware_id,
                    match_count, total,
                )
                if license_record.status == LicenseStatus.DEVICE_LOCKED:
                    return {
                        "valid": False,
                        "restrict_nfc": True,
                        "restrict_qr": True,
                        "restrict_import": True,
                        "restrict_id_card": True,
                        "device_change_request_id": change_req.id,
                        "message": f"Hardware changed substantially — {match_count}/{total} components matched. License locked. Contact Super Admin.",
                    }
                return {
                    "valid": False,
                    "restrict_nfc": False,
                    "restrict_qr": False,
                    "restrict_import": False,
                    "restrict_id_card": False,
                    "device_change_request_id": change_req.id,
                    "message": f"Hardware changed — {match_count}/{total} components matched. License in review mode (read-only, 24h auto-approve).",
                }
        else:
            current = get_machine_fingerprint()
            if license_record.machine_fingerprint != current:
                logger.warning("Hardware fingerprint mismatch (legacy exact hash)")
                log_audit(
                    db, "system", "HW_MISMATCH", "licenses",
                    license_record.id,
                    old_data={"machine_fingerprint": license_record.machine_fingerprint},
                    school_id=license_record.school_id,
                )
                return {
                    "valid": False,
                    "restrict_nfc": True,
                    "restrict_qr": True,
                    "restrict_import": True,
                    "restrict_id_card": True,
                    "message": "Hardware fingerprint mismatch",
                }

    # Check online — verify against cloud license server
    cloud_ok = _can_reach_license_server()
    if cloud_ok:
        current_fingerprint = get_machine_fingerprint()
        cloud_result = _verify_cloud_license(
            license_record.key, current_fingerprint,
            tpm_sealed=license_record.tpm_sealed_data,
            environment=license_record.runtime_environment,
        )
        if cloud_result.get("valid"):
            # Reset offline grace period on successful cloud check
            license_record.offline_grace_start = None
            license_record.last_online_validation = datetime.now(timezone.utc)
            db.commit()
            return {
                "valid": True,
                "restrict_nfc": False,
                "restrict_qr": False,
                "restrict_import": False,
                "restrict_id_card": False,
                "message": "License is valid (cloud verified)",
            }
        # Cloud says invalid — check if we're in offline grace (environment-aware)
        if license_record.last_online_validation:
            env = license_record.runtime_environment or get_active_environment()
            max_grace = get_environment_grace_days(env)
            now = datetime.now(timezone.utc)
            if license_record.offline_grace_start is None:
                license_record.offline_grace_start = now
                db.commit()
            grace_days = (now - license_record.offline_grace_start).days
            if grace_days <= max_grace:
                return {
                    "valid": True,
                    "restrict_nfc": False,
                    "restrict_qr": False,
                    "restrict_import": False,
                    "restrict_id_card": False,
                    "message": f"License in offline grace ({max_grace - grace_days} days remaining, {env})",
                }
        return {
            "valid": False,
            "restrict_nfc": True,
            "restrict_qr": True,
            "restrict_import": True,
            "restrict_id_card": True,
            "message": f"Cloud verification failed: {cloud_result.get('message', 'unknown error')}",
        }

    # Offline mode — check grace period (environment-aware)
    env = license_record.runtime_environment or get_active_environment()
    max_grace = get_environment_grace_days(env)
    now = datetime.now(timezone.utc)
    if license_record.offline_grace_start is None:
        license_record.offline_grace_start = now
        db.commit()

    grace_days = (now - license_record.offline_grace_start).days
    if grace_days > max_grace:
        return {
            "valid": False,
            "restrict_nfc": True,
            "restrict_qr": True,
            "restrict_import": True,
            "restrict_id_card": True,
            "message": f"Offline grace period expired ({grace_days} days, max {max_grace} for {env})",
        }

    return {
        "valid": True,
        "restrict_nfc": True,
        "restrict_qr": True,
        "restrict_import": True,
        "restrict_id_card": True,
        "message": f"License valid offline ({max_grace - grace_days} days remaining, {env})",
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
    """Bind license to current machine hardware on first activation.
    
    Stores both the SHA-256 fingerprint hash and raw 8-component JSON
    (base64-encoded) for 75% tolerance matching on subsequent starts.
    Also records the detected runtime environment (bare_metal/vm/docker).
    Optionally TPM-seals the fingerprint for enhanced binding.
    """
    env = get_active_environment()
    fingerprint = get_environment_fingerprint(env)
    components = get_effective_fingerprint_components(env)
    encoded = encode_hardware_components(components)
    lic = db.query(License).filter(License.id == license_id).first()
    if lic and not lic.machine_fingerprint:
        lic.machine_fingerprint = fingerprint
        lic.hardware_id = encoded
        lic.runtime_environment = env
        try:
            from app.services.tpm_service import seal_license_data
            lic.tpm_sealed_data = seal_license_data(fingerprint)
        except Exception:
            pass
        db.commit()
        invalidate_license_cache()
