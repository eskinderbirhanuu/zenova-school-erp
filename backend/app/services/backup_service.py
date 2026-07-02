import os
import json
import shutil
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.config import settings

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "backups")
MANIFEST_PATH = os.path.join(BACKUP_DIR, "manifest.json")
os.makedirs(BACKUP_DIR, exist_ok=True)

RETENTION_HOURLY = 24
RETENTION_DAILY = 30
RETENTION_WEEKLY = 12


def _load_manifest() -> list:
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, "r") as f:
            return json.load(f)
    return []


def _save_manifest(entries: list):
    with open(MANIFEST_PATH, "w") as f:
        json.dump(entries, f, indent=2, default=str)


def create_backup() -> dict:
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

    entry = {
        "filename": os.path.basename(filepath),
        "created_at": now.isoformat(),
        "size_bytes": size,
        "size_display": _format_size(size),
    }

    manifest = _load_manifest()
    manifest.append(entry)
    _save_manifest(manifest)

    entry.pop("size_bytes", None)

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
            if kept_hourly < RETENTION_HOURLY:
                keep.add(e["filename"])
                kept_hourly += 1

    kept_daily = 0
    seen_dates = set()
    for e in by_age:
        created = datetime.fromisoformat(e["created_at"])
        date_key = created.strftime("%Y-%m-%d")
        if date_key not in seen_dates:
            if kept_daily < RETENTION_DAILY:
                keep.add(e["filename"])
                seen_dates.add(date_key)
                kept_daily += 1

    kept_weekly = 0
    seen_weeks = set()
    for e in by_age:
        created = datetime.fromisoformat(e["created_at"])
        week_key = created.strftime("%Y-W%W")
        if week_key not in seen_weeks:
            if kept_weekly < RETENTION_WEEKLY:
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
