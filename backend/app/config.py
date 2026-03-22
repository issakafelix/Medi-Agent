from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    _backend_env = str(Path(__file__).resolve().parents[1] / ".env")
    model_config = SettingsConfigDict(
        # Prefer backend/.env, but allow root .env as a fallback.
        env_file=(_backend_env, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "dev"
    app_host: str = "0.0.0.0"
    app_port: int = 3001

    cors_origins: str = "*"
    trusted_hosts: str = "*"

    database_url: str = "sqlite:///./app.db"

    max_upload_bytes: int = 5 * 1024 * 1024
    rate_limit_per_minute: int = 60

    # LLM provider settings (OpenAI-compatible HTTP API)
    # disabled | openai-compatible | gemini
    llm_provider: str = "disabled" 
    llm_request_timeout_s: float = 45.0
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com"
    openai_chat_model: str = "gpt-4o-mini"
    openai_vision_model: str = "gpt-4o-mini"

    # Google AI Studio (Gemini) settings
    gemini_api_key: str = ""
    # Model used by Gemini adapter
    gemini_model: str = "gemini-2.0-flash"

    # Image generation (OpenAI Images API)
    openai_image_model: str = "dall-e-3"
    openai_image_size: str = "1024x1024"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
