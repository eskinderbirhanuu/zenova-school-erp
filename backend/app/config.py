import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://zenova_user:zenova_pass@localhost:5432/zenova_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-key"
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

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from_name: str = "ZENOVA School"
    email_from_address: str = "noreply@zenova.com"

    telegram_webhook_base_url: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


os.environ.setdefault("ENVIRONMENT", "development")
_settings_instance = None


def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
        if _settings_instance.is_production:
            _settings_instance.cookie_secure = True
    return _settings_instance


settings = get_settings()
