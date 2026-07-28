from pydantic_settings import BaseSettings
from typing import Optional
import sys


class Settings(BaseSettings):
    database_url: str = "sqlite:///./zenova_cloud.db"
    secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    license_private_key_path: str = ""
    license_public_key_path: str = ""
    super_admin_email: str = "super@zenova.app"
    super_admin_password: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.secret_key:
            print("FATAL: SECRET_KEY environment variable is required", file=sys.stderr)
            sys.exit(1)
        if not self.super_admin_password:
            print("FATAL: SUPER_ADMIN_PASSWORD environment variable is required", file=sys.stderr)
            sys.exit(1)


settings = Settings()
