import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_requires_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("NINEROUTER_URL", "http://localhost:20128")
    monkeypatch.setenv("NINEROUTER_API_KEY", "test-key")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_loads_required_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:password@db:5432/nusapolicy")
    monkeypatch.setenv("NINEROUTER_URL", "http://localhost:20128")
    monkeypatch.setenv("NINEROUTER_API_KEY", "test-key")

    settings = Settings(_env_file=None)

    assert settings.ninerouter_model == "master-fallback"
    assert settings.ninerouter_api_key.get_secret_value() == "test-key"

