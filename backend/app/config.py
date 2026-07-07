import os
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


KNOWN_WEAK_KEYS = frozenset({
    "",
    "dev-secret-key",
    "dev-secret-key-change-in-production",
    "your-super-secret-key-change-this-in-production",
    "change-me-to-a-strong-secret-key",
    "zenova-super-admin-secret-key-change-in-production",
})


class Settings(BaseSettings):
    database_url: str = "postgresql://zenova_user:zenova_pass@localhost:5432/zenova_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    environment: str = "development"
    bcrypt_rounds: int = 12
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.5:3000"
    login_rate_limit: int = 5
    login_rate_window_seconds: int = 300
    auth_rate_limit: int = 10
    auth_rate_window_seconds: int = 60
    api_rate_limit: int = 200
    api_rate_window_seconds: int = 60
    brute_force_max_per_ip: int = 20
    brute_force_max_per_id: int = 5
    brute_force_lockout_seconds: int = 900
    license_offline_grace_days: int = 45
    cookie_secure: bool = False
    build_id: str = "0"
    super_admin_phone: str = ""
    super_admin_email: str = ""
    master_setup_key: str = ""
    trusted_networks: str = ""  # Comma-separated CIDR: "192.168.0.0/16,10.0.0.0/8"
    sync_secret: str = ""  # Shared secret for HMAC sync auth

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from_name: str = "ZENOVA School"
    email_from_address: str = "noreply@zenova.com"

    telegram_webhook_base_url: str = ""
    archive_retention_attendance_days: int = 730
    archive_retention_notifications_days: int = 180
    archive_retention_audit_logs_days: int = 365
    archive_retention_sync_queue_days: int = 90

    db_pool_size: int = 10
    db_max_overflow: int = 20

    backup_encrypt_enabled: bool = False
    backup_encryption_key: str = ""
    backup_cloud_url: str = ""
    backup_cloud_access_key: str = ""
    backup_cloud_secret_key: str = ""

    base_url: str = "http://localhost:8000"
    license_server_url: str = "https://superadmin.free.nf"
    license_offline_grace_days: int = 45

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def validate(self) -> None:
        if self.is_production:
            if self.secret_key in KNOWN_WEAK_KEYS:
                raise ValueError(
                    "SECRET_KEY is a known default — generate a strong key with:\n"
                    "  python -c \"import secrets; print(secrets.token_urlsafe(48))\""
                )
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters")
            if self.cookie_secure is False:
                self.cookie_secure = True
        else:
            if self.secret_key in KNOWN_WEAK_KEYS or len(self.secret_key) < 32:
                import warnings
                warnings.warn(
                    "SECRET_KEY is weak or too short. "
                    "Generate a strong key for production with: "
                    "python -c \"import secrets; print(secrets.token_urlsafe(48))\"",
                    RuntimeWarning,
                )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


os.environ.setdefault("ENVIRONMENT", "development")
_settings_instance = None


def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
        try:
            _settings_instance.validate()
        except ValidationError as exc:
            raise RuntimeError(f"Invalid settings: {exc}") from exc
        except ValueError as exc:
            raise RuntimeError(str(exc)) from exc
    return _settings_instance


settings = get_settings()
