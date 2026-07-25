from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://zenova_cc:zenova_cc@localhost:5433/zenova_control"
    secret_key: str = "change-me-control-center-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    environment: str = "development"
    allowed_origins: str = "http://localhost:3001,http://127.0.0.1:3001"
    license_private_key_path: str = "/app/keys/private.pem"
    license_public_key_path: str = "/app/keys/public.pem"
    super_admin_email: str = "admin@zenova.app"
    super_admin_password: str = "change-me"
    update_storage_path: str = "/app/updates"
    metrics_retention_days: int = 90

    class Config:
        env_file = ".env"

settings = Settings()
