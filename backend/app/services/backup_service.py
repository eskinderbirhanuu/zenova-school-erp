import os
import json
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.config import settings
from app.core.constants import BACKUP_BACKUP_RETENTION_HOURLY, BACKUP_BACKUP_RETENTION_DAILY, BACKUP_BACKUP_RETENTION_WEEKLY
from app.utils.circuit_breaker import CircuitBreaker

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "backups")
_cloud_backup_breaker = CircuitBreaker("cloud_backup", failure_threshold=3, recovery_timeout=120)
MANIFEST_PATH = os.path.join(BACKUP_DIR, "manifest.json")
os.makedirs(BACKUP_DIR, exist_ok=True)


def _load_manifest() -> list:
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, "r") as f:
            return json.load(f)
    return []


def _save_manifest(entries: list):
    with open(MANIFEST_PATH, "w") as f:
        json.dump(entries, f, indent=2, default=str)


def _encrypt_file(filepath: str, recipient_key: Optional[str] = None) -> str:
    """Encrypt a file using age (modern) or GPG.
    
    Uses age if available (preferred), falls back to GPG.
    If neither is available and no recipient_key is set, returns unencrypted.
    """
    encrypted_path = filepath + ".age"

    if recipient_key:
        # Try age
        age_path = shutil.which("age")
        if age_path:
            result = subprocess.run(
                [age_path, "-r", recipient_key, "-o", encrypted_path, filepath],
                capture_output=True, text=True,
            )
            if result.returncode == 0:
                os.remove(filepath)
                return encrypted_path

        # Fallback to GPG
        gpg_path = shutil.which("gpg")
        if gpg_path:
            result = subprocess.run(
                [gpg_path, "--yes", "--batch", "--trust-model", "always",
                 "-r", recipient_key, "--encrypt", "--output", encrypted_path, filepath],
                capture_output=True, text=True,
            )
            if result.returncode == 0:
                os.remove(filepath)
                return encrypted_path

    # No encryption available or key not set
    return filepath


def _upload_to_cloud(filepath: str) -> bool:
    """Upload backup to cloud storage. Supports S3-compatible and rclone."""
    if not settings.backup_cloud_url:
        return False

    import urllib.request
    import urllib.parse

    try:
        url = f"{settings.backup_cloud_url.rstrip('/')}/{os.path.basename(filepath)}"
        if settings.backup_cloud_access_key and settings.backup_cloud_secret_key:
            # Simple HTTP PUT with auth headers
            import base64
            auth_str = f"{settings.backup_cloud_access_key}:{settings.backup_cloud_secret_key}"
            auth_bytes = base64.b64encode(auth_str.encode()).decode()

            with open(filepath, "rb") as f:
                data = f.read()

            def _do_upload():
                req = urllib.request.Request(
                    url,
                    data=data,
                    method="PUT",
                    headers={
                        "Authorization": f"Basic {auth_bytes}",
                        "Content-Type": "application/octet-stream",
                    },
                )
                with urllib.request.urlopen(req, timeout=60):
                    pass

            _cloud_backup_breaker.call(_do_upload)
        else:
            # Try rclone
            rclone_path = shutil.which("rclone")
            if rclone_path:
                dest = settings.backup_cloud_url
                result = subprocess.run(
                    [rclone_path, "copy", filepath, dest],
                    capture_output=True, text=True, timeout=120,
                )
                return result.returncode == 0
            return False

        return True
    except Exception:
        return False


def create_backup(encrypt: Optional[bool] = None) -> dict:
    now = datetime.now(timezone.utc)
    filename = f"zenova_backup_{now.strftime('%Y%m%d_%H%M%S')}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)
    pg_dump_path = shutil.which("pg_dump")

    if pg_dump_path:
        db_url = settings.database_url
        cmd = [pg_dump_path, "--no-owner", "--no-acl", "-f", filepath, db_url]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {result.stderr}")
        size = os.path.getsize(filepath)
    else:
        filepath_safe = filepath + ".json"
        manifest = _load_manifest()
        with open(filepath_safe, "w") as f:
            json.dump({"backup": "placeholder", "manifest": manifest}, f)
        size = os.path.getsize(filepath_safe)
        filepath = filepath_safe

    # Encrypt if requested
    encrypt = encrypt if encrypt is not None else settings.backup_encrypt_enabled
    if encrypt and settings.backup_encryption_key:
        original_path = filepath
        filepath = _encrypt_file(filepath, settings.backup_encryption_key)
        if filepath != original_path:
            size = os.path.getsize(filepath)

    entry = {
        "filename": os.path.basename(filepath),
        "created_at": now.isoformat(),
        "size_bytes": size,
        "size_display": _format_size(size),
        "encrypted": encrypt and settings.backup_encryption_key and filepath.endswith((".age", ".gpg")),
    }

    manifest = _load_manifest()
    manifest.append(entry)
    _save_manifest(manifest)

    entry.pop("size_bytes", None)

    # Upload to cloud after successful backup
    if settings.backup_cloud_url:
        _upload_to_cloud(filepath)

    _apply_rotation()

    return entry


def _apply_rotation():
    now = datetime.now(timezone.utc)
    manifest = _load_manifest()

    by_age = sorted(manifest, key=lambda e: e["created_at"], reverse=True)

    keep = set()

    kept_hourly = 0
    for e in by_age:
        created = datetime.fromisoformat(e["created_at"])
        if (now - created) < timedelta(hours=24):
            if kept_hourly < BACKUP_RETENTION_HOURLY:
                keep.add(e["filename"])
                kept_hourly += 1

    kept_daily = 0
    seen_dates = set()
    for e in by_age:
        created = datetime.fromisoformat(e["created_at"])
        date_key = created.strftime("%Y-%m-%d")
        if date_key not in seen_dates:
            if kept_daily < BACKUP_RETENTION_DAILY:
                keep.add(e["filename"])
                seen_dates.add(date_key)
                kept_daily += 1

    kept_weekly = 0
    seen_weeks = set()
    for e in by_age:
        created = datetime.fromisoformat(e["created_at"])
        week_key = created.strftime("%Y-W%W")
        if week_key not in seen_weeks:
            if kept_weekly < BACKUP_RETENTION_WEEKLY:
                keep.add(e["filename"])
                seen_weeks.add(week_key)
                kept_weekly += 1

    for e in manifest:
        if e["filename"] not in keep:
            filepath = os.path.join(BACKUP_DIR, e["filename"])
            if os.path.exists(filepath):
                os.remove(filepath)

    manifest = [e for e in manifest if e["filename"] in keep]
    _save_manifest(manifest)


def list_backups() -> list:
    return list(reversed(_load_manifest()))


def delete_backup(filename: str) -> bool:
    filepath = os.path.join(BACKUP_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    manifest = _load_manifest()
    manifest = [e for e in manifest if e["filename"] != filename]
    _save_manifest(manifest)
    return True


def _format_size(bytes_: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_ < 1024:
            return f"{bytes_:.1f} {unit}"
        bytes_ /= 1024
    return f"{bytes_:.1f} TB"
