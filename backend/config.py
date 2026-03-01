"""SpotSEO - Configuration settings loaded from .env"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # OpenRouter API
    openrouter_api_key: str = ""
    openrouter_model: str = "moonshotai/kimi-k2.5"

    # Decodo Smart Proxy
    decodo_proxy_host: str = "gate.decodo.com"
    decodo_proxy_port: int = 7000
    decodo_proxy_user: str = ""
    decodo_proxy_pass: str = ""

    # Database (Supabase PostgreSQL)
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/postgres"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Security
    app_secret_key: str = "change-this-to-a-random-secret-key"

    # SERP API Providers
    serpapi_key: str = ""
    dataforseo_login: str = ""
    dataforseo_password: str = ""

    # SpeedyIndex API (Google indexation check)
    speedyindex_api_key: str = ""

    # DomDetailer API (domain metrics)
    domdetailer_api_key: str = ""

    # Debug
    debug: bool = True

    # SERP Scraping
    serp_delay_min: float = 2.0
    serp_delay_max: float = 6.0
    max_concurrent_scrapes: int = 3

    @property
    def decodo_proxy_url(self) -> Optional[str]:
        if self.decodo_proxy_user and self.decodo_proxy_pass:
            return (
                f"http://{self.decodo_proxy_user}:{self.decodo_proxy_pass}"
                f"@{self.decodo_proxy_host}:{self.decodo_proxy_port}"
            )
        return None

    @property
    def has_ai(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def has_proxy(self) -> bool:
        return bool(self.decodo_proxy_user and self.decodo_proxy_pass)

    @property
    def has_serpapi(self) -> bool:
        return bool(self.serpapi_key)

    @property
    def has_dataforseo(self) -> bool:
        return bool(self.dataforseo_login and self.dataforseo_password)

    @property
    def has_speedyindex(self) -> bool:
        return bool(self.speedyindex_api_key)

    @property
    def has_domdetailer(self) -> bool:
        return bool(self.domdetailer_api_key)

    model_config = {
        "env_file": os.path.join(os.path.dirname(__file__), "..", "config", ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
