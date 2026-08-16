"""Tests for Gap N2 — FCM/APNs push channel (device-token registration + relay)."""
from unittest.mock import MagicMock, patch
import pytest

from app.models.communication import Notification
from app.services import fcm_relay
from app.services.fcm_relay import push_enabled, send_push, _send_to_fcm, _get_access_token
from app.api.v1.endpoints.communication import (
    register_device_token, list_device_tokens, unregister_device_token,
    get_notification_preferences, update_notification_preferences,
)


def _make_notification(user_id="parent-1", ntype="finance", title="Fee due", message="Pay now"):
    n = Notification(user_id=user_id, title=title, message=message, notification_type=ntype)
    return n


def _make_device(token="tok-1", platform="android", is_active=True):
    d = MagicMock()
    d.token = token
    d.platform = platform
    d.is_active = is_active
    return d


class TestPushEnabled:
    def test_disabled_by_default(self):
        with patch.object(fcm_relay.settings, "feature_push", False):
            assert push_enabled() is False

    def test_enabled_with_full_config(self):
        with patch.object(fcm_relay.settings, "feature_push", True), \
             patch.object(fcm_relay.settings, "fcm_project_id", "proj"), \
             patch.object(fcm_relay.settings, "fcm_credentials_json", "{}"):
            assert push_enabled() is True

    def test_enabled_requires_credentials(self):
        with patch.object(fcm_relay.settings, "feature_push", True), \
             patch.object(fcm_relay.settings, "fcm_project_id", "proj"), \
             patch.object(fcm_relay.settings, "fcm_credentials_json", ""):
            assert push_enabled() is False


class TestSendPush:
    def test_noop_when_feature_disabled(self):
        db = MagicMock()
        with patch.object(fcm_relay.settings, "feature_push", False), \
             patch.object(fcm_relay, "_prefs_allow_push", return_value=True) as prefs:
            send_push(db, _make_notification())
        prefs.assert_not_called()

    def test_noop_when_user_opted_out(self):
        db = MagicMock()
        with patch.object(fcm_relay.settings, "feature_push", True), \
             patch.object(fcm_relay.settings, "fcm_project_id", "p"), \
             patch.object(fcm_relay.settings, "fcm_credentials_json", "{}"), \
             patch.object(fcm_relay, "_prefs_allow_push", return_value=False), \
             patch.object(fcm_relay, "_send_to_fcm") as sender:
            send_push(db, _make_notification())
        sender.assert_not_called()

    def test_sends_to_each_active_device(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [
            _make_device("tok-1"), _make_device("tok-2"),
        ]
        with patch.object(fcm_relay.settings, "feature_push", True), \
             patch.object(fcm_relay.settings, "fcm_project_id", "p"), \
             patch.object(fcm_relay.settings, "fcm_credentials_json", "{}"), \
             patch.object(fcm_relay, "_prefs_allow_push", return_value=True), \
             patch.object(fcm_relay, "_send_to_fcm", return_value=None) as sender:
            send_push(db, _make_notification())
        assert sender.call_count == 2
        db.commit.assert_called_once()

    def test_prunes_unregistered_token(self):
        db = MagicMock()
        dev = _make_device("tok-stale")
        db.query.return_value.filter.return_value.all.return_value = [dev]
        with patch.object(fcm_relay.settings, "feature_push", True), \
             patch.object(fcm_relay.settings, "fcm_project_id", "p"), \
             patch.object(fcm_relay.settings, "fcm_credentials_json", "{}"), \
             patch.object(fcm_relay, "_prefs_allow_push", return_value=True), \
             patch.object(fcm_relay, "_send_to_fcm", return_value="UNREGISTERED"):
            send_push(db, _make_notification())
        assert dev.is_active is False

    def test_fcm_error_is_nonfatal(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [_make_device("tok-1")]
        with patch.object(fcm_relay.settings, "feature_push", True), \
             patch.object(fcm_relay.settings, "fcm_project_id", "p"), \
             patch.object(fcm_relay.settings, "fcm_credentials_json", "{}"), \
             patch.object(fcm_relay, "_prefs_allow_push", return_value=True), \
             patch.object(fcm_relay, "_send_to_fcm", side_effect=RuntimeError("fcm down")):
            send_push(db, _make_notification())
        db.commit.assert_called_once()


class TestGetAccessToken:
    def test_returns_cached_token(self):
        fcm_relay._token_cache["token"] = "cached"
        fcm_relay._token_cache["expires_at"] = int(__import__("time").time()) + 3000
        try:
            with patch("httpx.post") as post:
                tok = _get_access_token()
            assert tok == "cached"
            post.assert_not_called()
        finally:
            fcm_relay._token_cache["token"] = None
            fcm_relay._token_cache["expires_at"] = 0


class TestSendToFcm:
    def test_marks_unregistered(self):
        resp = MagicMock()
        resp.status_code = 404
        resp.text = "Requested entity was not found. UNREGISTERED"
        with patch("httpx.post", return_value=resp), \
             patch.object(fcm_relay, "_get_access_token", return_value="tok"):
            err = _send_to_fcm("stale", "t", "m", "finance")
        assert err == "UNREGISTERED"

    def test_ok_returns_none(self):
        resp = MagicMock()
        resp.status_code = 200
        resp.text = "{}"
        with patch("httpx.post", return_value=resp), \
             patch.object(fcm_relay, "_get_access_token", return_value="tok"):
            err = _send_to_fcm("good", "t", "m", "finance")
        assert err is None


def _make_user(user_id="parent-1"):
    u = MagicMock()
    u.id = user_id
    u.school_id = "school-1"
    return u


class TestDeviceTokenEndpoints:
    def test_register_creates_device(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        user = _make_user()
        with patch.object(fcm_relay.settings, "feature_push", True):
            dev = register_device_token(MagicMock(platform="android", token="tok-new"), db=db, current_user=user)
        assert dev.user_id == "parent-1"
        assert dev.token == "tok-new"
        db.add.assert_called_once()

    def test_register_reactivates_existing(self):
        db = MagicMock()
        existing = MagicMock()
        existing.user_id = "parent-1"
        existing.token = "tok-1"
        existing.is_active = False
        db.query.return_value.filter.return_value.first.return_value = existing
        user = _make_user()
        with patch.object(fcm_relay.settings, "feature_push", True):
            dev = register_device_token(MagicMock(platform="ios", token="tok-1"), db=db, current_user=user)
        assert existing.is_active is True
        assert existing.platform == "ios"
        db.add.assert_not_called()

    def test_register_rejected_when_feature_disabled(self):
        db = MagicMock()
        user = _make_user()
        with patch.object(fcm_relay.settings, "feature_push", False), \
             pytest.raises(Exception):
            register_device_token(MagicMock(platform="android", token="tok-1"), db=db, current_user=user)

    def test_list_returns_own_tokens(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
            _make_device("tok-1")
        ]
        user = _make_user()
        with patch.object(fcm_relay.settings, "feature_push", True):
            result = list_device_tokens(db=db, current_user=user)
        assert len(result) == 1

    def test_unregister_deactivates(self):
        db = MagicMock()
        device = _make_device("tok-1", is_active=True)
        db.query.return_value.filter.return_value.first.return_value = device
        user = _make_user()
        with patch.object(fcm_relay.settings, "feature_push", True):
            unregister_device_token("tok-1", db=db, current_user=user)
        assert device.is_active is False

    def test_unregister_404_when_missing(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        user = _make_user()
        with patch.object(fcm_relay.settings, "feature_push", True), \
             pytest.raises(Exception):
            unregister_device_token("nope", db=db, current_user=user)


class TestPreferencePushFlag:
    def test_update_push_on(self):
        db = MagicMock()
        pref = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = pref
        user = _make_user()
        update_notification_preferences(MagicMock(push_on=False, email_on=None, telegram_on=None, sms_on=None),
                                        db=db, current_user=user)
        assert pref.push_on is False
