import pytest
from app.config import Settings


def test_production_settings_require_non_default_secret_key():
    with pytest.raises(ValueError):
        Settings(environment="production", secret_key="dev-secret-key").validate()


def test_non_default_key_allowed_in_dev():
    settings = Settings(environment="development", secret_key="a-strong-secret-key-that-is-long-enough-32chars")
    settings.validate()
    assert settings.environment == "development"
