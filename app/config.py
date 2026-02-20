from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # App Info
    app_name: str = "FastAPI Application"
    version: str = "1.0.0"
    debug: bool = False

    # API Settings
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "sqlite+aiosqlite:///./app.db"

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "https://tryseedling.live",
        "https://www.tryseedling.live"
    ]

    # Frontend URL for redirects
    frontend_url: str = "http://localhost:3000"

    # Stripe
    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_webhook_secret: str = ""

    # SendGrid (Email)
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""

    # AWS S3
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str
    aws_s3_bucket: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
