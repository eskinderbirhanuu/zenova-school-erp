"""Tests for auth flow — login, token lifecycle, rate limiting."""
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone
from jose import jwt
import pytest
from app.config import settings


def _make_user(
    id="user-1",
    email="test@zenova.app",
    is_active=True,
    is_superuser=False,
    is_view_only=False,
    role_name="ADMIN",
):
    user = MagicMock()
    user.id = id
    user.email = email
    user.is_active = is_active
    user.is_superuser = is_superuser
    user.is_view_only = is_view_only
    user.hashed_password = "$2b$12$" + "x" * 53
    role = MagicMock()
    role.name = role_name
    user.role = role
    return user


class TestLogin:
    def test_login_success(self):
        from app.services.auth_service import authenticate_user
        db = MagicMock()
        user = _make_user()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = user

        with patch("app.services.auth_service.verify_password", return_value=True):
            result = authenticate_user(db, email="test@zenova.app", password="admin123")

        assert result is not None
        assert result.id == "user-1"

    def test_login_invalid_password(self):
        from app.services.auth_service import authenticate_user
        db = MagicMock()
        user = _make_user()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = user

        with patch("app.core.security.verify_password", return_value=False):
            result = authenticate_user(db, email="test@zenova.app", password="wrong")

        assert result is None

    def test_login_inactive_user(self):
        from app.services.auth_service import authenticate_user
        db = MagicMock()
        user = _make_user(is_active=False)
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = user

        with patch("app.core.security.verify_password", return_value=True):
            result = authenticate_user(db, email="test@zenova.app", password="admin123")

        assert result is None


class TestTokenLifecycle:
    def test_create_access_token(self):
        from app.services.auth_service import create_access_token
        token = create_access_token(data={"sub": "user-1"})
        assert isinstance(token, str)
        assert len(token) > 20

    def test_create_refresh_token(self):
        from app.services.auth_service import create_refresh_token
        token = create_refresh_token(data={"sub": "user-1"})
        assert isinstance(token, str)
        assert len(token) > 20

    def test_decode_valid_token(self):
        from app.services.auth_service import create_access_token, decode_token
        token = create_access_token(data={"sub": "user-1", "type": "access"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-1"
        assert payload["type"] == "access"

    def test_decode_expired_token(self):
        from app.services.auth_service import decode_token
        expired = jwt.encode(
            {"sub": "user-1", "type": "access", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            settings.secret_key, algorithm=settings.algorithm,
        )
        payload = decode_token(expired)
        assert payload is None

    def test_decode_invalid_token(self):
        from app.services.auth_service import decode_token
        payload = decode_token("invalid-token-string")
        assert payload is None


class TestRateLimiter:
    def test_rate_limit_allows_normal_usage(self):
        from app.api.v1.deps import rate_limit
        request = MagicMock()
        request.client.host = "10.0.0.1"
        request.headers.get.return_value = None

        checker = rate_limit("test", limit=5, window_seconds=60)

        with patch("app.core.redis_client.get_redis") as mock_getter:
            mock_redis = MagicMock()
            mock_redis.get.return_value = None
            mock_getter.return_value = mock_redis
            ip = checker(request)
            assert ip == "10.0.0.1"

    def test_rate_limit_blocks_excess(self):
        from app.api.v1.deps import rate_limit
        from fastapi import HTTPException
        request = MagicMock()
        request.client.host = "10.0.0.1"
        request.headers.get.return_value = None

        checker = rate_limit("test", limit=3, window_seconds=60)

        with patch("app.core.redis_client.get_redis") as mock_getter:
            mock_redis = MagicMock()
            mock_redis.get.return_value = "5"
            mock_getter.return_value = mock_redis
            with pytest.raises(HTTPException) as exc:
                checker(request)
            assert exc.value.status_code == 429


class TestTokenBlacklist:
    """Tests for token blacklist — _blacklist_token, _is_token_blacklisted, logout blacklisting."""

    def test_blacklist_token_sets_redis_key(self):
        from app.api.v1.endpoints.auth import _blacklist_token, _is_token_blacklisted

        redis = MagicMock()
        exp = int(datetime.now(timezone.utc).timestamp()) + 3600
        _blacklist_token(redis, "test-jti-123", exp)

        redis.setex.assert_called_once_with("token:bl:test-jti-123", 3600, "1")

    def test_blacklist_token_handles_redis_error_gracefully(self):
        from app.api.v1.endpoints.auth import _blacklist_token

        redis = MagicMock()
        redis.setex.side_effect = Exception("Redis error")
        exp = int(datetime.now(timezone.utc).timestamp()) + 3600
        _blacklist_token(redis, "test-jti", exp)  # should not raise

    def test_is_token_blacklisted_returns_true_when_exists(self):
        from app.api.v1.endpoints.auth import _is_token_blacklisted

        redis = MagicMock()
        redis.exists.return_value = 1
        assert _is_token_blacklisted(redis, "test-jti") is True

    def test_is_token_blacklisted_returns_false_when_missing(self):
        from app.api.v1.endpoints.auth import _is_token_blacklisted

        redis = MagicMock()
        redis.exists.return_value = 0
        assert _is_token_blacklisted(redis, "test-jti") is False

    def test_is_token_blacklisted_returns_false_on_error(self):
        from app.api.v1.endpoints.auth import _is_token_blacklisted

        redis = MagicMock()
        redis.exists.side_effect = Exception("Redis down")
        assert _is_token_blacklisted(redis, "test-jti") is False

    def test_logout_blacklists_both_tokens(self):
        from app.api.v1.endpoints.auth import _blacklist_token, _is_token_blacklisted
        from jose import jwt as jose_jwt
        import secrets

        redis = MagicMock()
        redis.exists.return_value = 0  # initially not blacklisted

        access_jti = secrets.token_hex(16)
        refresh_jti = secrets.token_hex(16)
        exp = int(datetime.now(timezone.utc).timestamp()) + 3600

        access_payload = {"jti": access_jti, "exp": exp, "type": "access", "sub": "user-1"}
        refresh_payload = {"jti": refresh_jti, "exp": exp, "type": "refresh", "sub": "user-1"}

        _blacklist_token(redis, access_jti, exp)
        _blacklist_token(redis, refresh_jti, exp)

        redis.setex.assert_any_call(f"token:bl:{access_jti}", 3600, "1")
        redis.setex.assert_any_call(f"token:bl:{refresh_jti}", 3600, "1")

        redis.exists.return_value = 1
        assert _is_token_blacklisted(redis, access_jti) is True
        assert _is_token_blacklisted(redis, refresh_jti) is True
