from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "sqlite:///./zenova_cloud.db"
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    license_private_key_path: str = ""
    license_public_key_path: str = ""
    super_admin_email: str = "super@zenova.app"
    super_admin_password: str = "change-me"
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
