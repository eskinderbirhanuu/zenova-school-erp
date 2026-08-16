"""Best-effort FCM push relay (Gap N2).

- Never raises: push is best-effort, the in-app inbox is the source of truth.
- Respects `NotificationPreference.push_on`.
- Prunes tokens FCM reports as UNREGISTERED (deactivate, keep row).
- Uses FCM HTTP v1 with a service-account credential (per-school, `FEATURE_PUSH`).
"""
import json
import logging
import time
from datetime import datetime, timezone

import httpx
from jose import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.communication import Notification
from app.models.notification_preference import NotificationPreference
from app.models.push_device import PushDevice

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
_token_cache = {"token": None, "expires_at": 0}


def push_enabled() -> bool:
    return settings.feature_push and bool(settings.fcm_project_id and settings.fcm_credentials_json)


def _parse_credentials() -> dict:
    return json.loads(settings.fcm_credentials_json)


def _get_access_token() -> str:
    now = int(time.time())
    if _token_cache["token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["token"]

    creds = _parse_credentials()
    iat = now
    exp = iat + 3600
    assertion = jwt.encode(
        {
            "iss": creds["client_email"],
            "scope": _SCOPE,
            "aud": _TOKEN_URL,
            "iat": iat,
            "exp": exp,
        },
        creds["private_key"],
        algorithm="RS256",
    )
    resp = httpx.post(
        _TOKEN_URL,
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    data = resp.json()
    _token_cache["token"] = data["access_token"]
    _token_cache["expires_at"] = iat + int(data.get("expires_in", 3600))
    return _token_cache["token"]


def _send_to_fcm(token: str, title: str, message: str, notification_type: str) -> str | None:
    """Send one push; return an error code if the token is stale."""
    access_token = _get_access_token()
    url = f"https://fcm.googleapis.com/v1/projects/{settings.fcm_project_id}/messages:send"
    body = {
        "message": {
            "token": token,
            "notification": {"title": title, "body": message},
            "data": {"type": notification_type or "general"},
            "android": {"priority": "high"},
        }
    }
    resp = httpx.post(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        json=body,
        timeout=10.0,
    )
    if resp.status_code == 404 or "UNREGISTERED" in resp.text:
        return "UNREGISTERED"
    resp.raise_for_status()
    return None


def _prefs_allow_push(db: Session, user_id: str) -> bool:
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    return pref.push_on if pref else True


def send_push(db: Session, notification: Notification) -> None:
    if not push_enabled():
        return
    if not _prefs_allow_push(db, notification.user_id):
        return

    devices = (
        db.query(PushDevice)
        .filter(
            PushDevice.user_id == notification.user_id,
            PushDevice.is_active.is_(True),
            PushDevice.deleted_at.is_(None),
        )
        .all()
    )
    if not devices:
        return

    title = notification.title or "ZENOVA"
    message = notification.message or ""
    ntype = notification.notification_type or "general"

    for device in devices:
        try:
            err = _send_to_fcm(device.token, title, message, ntype)
            if err == "UNREGISTERED":
                device.is_active = False
                device.updated_at = datetime.now(timezone.utc)
                logger.info("Pruned stale push token %s... for user %s", device.token[:12], notification.user_id)
        except Exception:
            logger.warning("FCM push failed for user %s", notification.user_id, exc_info=True)

    db.commit()
