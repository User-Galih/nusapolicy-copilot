from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated server-side configuration loaded from environment variables."""

    database_url: str
    ninerouter_url: str
    ninerouter_api_key: SecretStr
    ninerouter_model: str = "master-fallback"
    ninerouter_embedding_model: str = "openrouter/openai/text-embedding-3-small"

    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
