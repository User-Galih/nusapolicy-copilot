from pathlib import Path
from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """Validated server-side configuration loaded from environment variables."""

    database_url: str
    gemini_api_key: SecretStr
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_embedding_model: str = "gemini-embedding-2"

    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=(".env", str(REPO_ROOT / ".env")),
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
