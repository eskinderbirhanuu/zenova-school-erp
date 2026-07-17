"""Tests for Chapa payment gateway integration."""
from unittest.mock import MagicMock, patch, ANY
from decimal import Decimal
import httpx
import pytest
from app.services.chapa_service import (
    ChapaError, initialize_payment, verify_transaction,
    verify_webhook_signature, _default_chapa_keys, _get_school_chapa_keys,
)


class TestDefaultKeys:
    def test_returns_env_keys(self):
        with patch.dict("os.environ", {"CHAPA_SECRET_KEY": "sec-1", "CHAPA_PUBLIC_KEY": "pub-1"}):
            sec, pub = _default_chapa_keys()
            assert sec == "sec-1"
            assert pub == "pub-1"

    def test_returns_empty_on_missing(self):
        with patch("os.getenv", return_value="") as mock_getenv:
            sec, pub = _default_chapa_keys()
            assert sec == ""
            assert pub == ""


class TestGetSchoolChapaKeys:
    def test_returns_school_keys_when_found(self):
        db = MagicMock()
        config = MagicMock()
        config.secret_key = "school-sec"
        config.public_key = "school-pub"
        db.query.return_value.filter.return_value.first.return_value = config
        sec, pub = _get_school_chapa_keys(db, "school-1")
        assert sec == "school-sec"
        assert pub == "school-pub"

    def test_falls_back_to_env_when_no_school_config(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch.dict("os.environ", {"CHAPA_SECRET_KEY": "env-sec", "CHAPA_PUBLIC_KEY": "env-pub"}):
            sec, pub = _get_school_chapa_keys(db, "school-1")
            assert sec == "env-sec"
            assert pub == "env-pub"

    def test_falls_back_to_env_when_no_school_id(self):
        db = MagicMock()
        with patch.dict("os.environ", {"CHAPA_SECRET_KEY": "env-sec", "CHAPA_PUBLIC_KEY": "env-pub"}):
            sec, pub = _get_school_chapa_keys(db)
            assert sec == "env-sec"
            assert pub == "env-pub"

    def test_returns_empty_when_no_keys_at_all(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("os.getenv", return_value=""):
            sec, pub = _get_school_chapa_keys(db, "school-1")
            assert sec == ""
            assert pub == ""


class TestInitializePayment:
    def _make_config(self, secret_key="test-secret", public_key="test-pub"):
        config = MagicMock()
        config.secret_key = secret_key
        config.public_key = public_key
        return config

    def test_successful_initialize(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = self._make_config()
        with patch("app.services.chapa_service.httpx.post") as mock_post:
            mock_response = MagicMock()
            mock_response.json.return_value = {"status": "success", "data": {"checkout_url": "https://checkout.chapa.co/1"}}
            mock_post.return_value = mock_response
            result = initialize_payment(
                amount=Decimal("100.00"),
                currency="ETB",
                email="test@example.com",
                first_name="John",
                last_name="Doe",
                tx_ref="tx-1",
                callback_url="https://example.com/callback",
                return_url="https://example.com/return",
                db=db,
                school_id="school-1",
            )
            assert result["status"] == "success"
            mock_post.assert_called_once_with(
                "https://api.chapa.co/v1/transaction/initialize",
                headers={"Authorization": "Bearer test-secret", "Content-Type": "application/json"},
                json=ANY,
                timeout=30.0,
            )

    def test_raises_on_missing_key(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ChapaError, match="Chapa secret key not configured"):
                initialize_payment(
                    amount=Decimal("100"),
                    currency="ETB",
                    email="test@example.com",
                    first_name="J",
                    last_name="D",
                    tx_ref="tx-1",
                    callback_url="http://cb",
                    return_url="http://ret",
                    db=db,
                    school_id="school-1",
                )

    def test_raises_on_http_error(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = self._make_config()
        with patch("app.services.chapa_service.httpx.post", side_effect=httpx.ConnectError("Connection refused")):
            with pytest.raises(ChapaError, match="Chapa API error"):
                initialize_payment(
                    amount=Decimal("50"),
                    currency="ETB",
                    email="a@b.com",
                    first_name="A",
                    last_name="B",
                    tx_ref="tx-2",
                    callback_url="http://cb",
                    return_url="http://ret",
                    db=db,
                    school_id="school-1",
                )


class TestVerifyTransaction:
    def test_successful_verify(self):
        with patch.dict("os.environ", {"CHAPA_SECRET_KEY": "test-secret"}):
            with patch("app.services.chapa_service.httpx.get") as mock_get:
                mock_response = MagicMock()
                mock_response.json.return_value = {"status": "success", "data": {"tx_ref": "tx-1"}}
                mock_get.return_value = mock_response
                result = verify_transaction("tx-1")
                assert result["status"] == "success"
                mock_get.assert_called_once_with(
                    "https://api.chapa.co/v1/transaction/verify/tx-1",
                    headers={"Authorization": "Bearer test-secret", "Content-Type": "application/json"},
                    timeout=30.0,
                )

    def test_raises_on_http_error(self):
        with patch.dict("os.environ", {"CHAPA_SECRET_KEY": "test-secret"}):
            with patch("app.services.chapa_service.httpx.get", side_effect=httpx.TimeoutException("Request timed out")):
                with pytest.raises(ChapaError, match="Chapa verification error"):
                    verify_transaction("tx-1")


class TestVerifyWebhookSignature:
    def test_valid_signature(self):
        with patch.dict("os.environ", {"CHAPA_SECRET_KEY": "shared-secret"}):
            import hmac, hashlib
            payload = b'{"event":"charge.success"}'
            expected_sig = hmac.new(b"shared-secret", payload, hashlib.sha256).hexdigest()
            assert verify_webhook_signature(payload, expected_sig)

    def test_invalid_signature(self):
        with patch.dict("os.environ", {"CHAPA_SECRET_KEY": "shared-secret"}):
            assert not verify_webhook_signature(b'{"event":"charge.success"}', "invalid-sig")

    def test_returns_false_when_no_key(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("os.getenv", return_value=""):
            assert not verify_webhook_signature(b"{}", "sig", db=db, school_id="school-1")
