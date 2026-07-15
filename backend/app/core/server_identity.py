import json
import uuid
import hashlib
import secrets
import platform
import socket
import os
from pathlib import Path
from datetime import datetime, timezone

SERVER_ID_FILE = os.environ.get(
    "SERVER_ID_FILE",
    str(Path("/data/server_id.json") if os.name != "nt" else Path(os.environ.get("PROGRAMDATA", "C:\\ProgramData")) / "zenova" / "server_id.json"),
)


def generate_server_id():
    return f"SRV-{uuid.uuid4().hex[:12].upper()}"


def generate_sync_secret():
    return secrets.token_urlsafe(32)


def generate_fingerprint():
    components = [
        platform.machine() or "",
        platform.processor() or "",
        platform.node() or "",
        str(uuid.getnode()),
        socket.gethostname() or "",
    ]
    raw = "|".join(components)
    return hashlib.sha256(raw.encode()).hexdigest()


def get_server_identity():
    path = Path(SERVER_ID_FILE)
    if path.exists():
        return json.loads(path.read_text())
    return None


def save_server_identity(server_id, server_role, school_id=None, branch_id=None):
    path = Path(SERVER_ID_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    sync_secret = generate_sync_secret()
    data = {
        "server_id": server_id,
        "server_role": server_role,
        "school_id": school_id,
        "branch_id": branch_id,
        "sync_secret": sync_secret,
        "fingerprint": generate_fingerprint(),
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    path.write_text(json.dumps(data, indent=2))
    return data


def is_already_registered():
    return get_server_identity() is not None
