<<<<<<< HEAD
from pydantic_settings import BaseSettings
from pydantic import Field, AliasChoices
from typing import List


class Settings(BaseSettings):
=======
"""
Application configuration.

Fails closed: SECRET_KEY and (in non-dev environments) STRIPE_WEBHOOK_SECRET
must be supplied via environment / .env. Insecure defaults are rejected at
process start, before any request is served.
"""
from typing import List

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings


_DEV_SECRET_PREFIXES = (
    "safetable-dev", "dev-", "changeme", "your-", "__replace", "replace_me",
)
_PLACEHOLDER_PREFIXES = ("placeholder", "whsec_placeholder", "sk_test_placeholder")


class Settings(BaseSettings):
    # Environment
    ENV: str = Field("dev", description="dev | staging | prod")

>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    # MongoDB
    MONGODB_URL: str = Field(
        "mongodb://localhost:27017",
        validation_alias=AliasChoices("MONGODB_URL", "DATABASE_URL"),
    )
    DATABASE_NAME: str = "safetable"

    # Groq AI
    GROQ_API_KEY: str = ""
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MODEL: str = "llama-3.1-70b-versatile"

    # OpenAI (Whisper STT)
    OPENAI_API_KEY: str = ""
    ASSEMBLYAI_API_KEY: str = ""

    # HeyGen (TTS)
    HEYGEN_API_KEY: str = ""
<<<<<<< HEAD

    # Stripe Payments
    STRIPE_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder"

    # Auth
    SECRET_KEY: str = "safetable-dev-secret-key-2025"
=======
    HEYGEN_VOICE_ID: str = "1bd001e7e50f421d891986aad5158bc8"

    # Stripe
    STRIPE_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = ""  # required in non-dev

    # Auth — SECRET_KEY has NO default. Process refuses to start without it.
    SECRET_KEY: str = ""
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origins(self) -> List[str]:
<<<<<<< HEAD
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
=======
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() in {"prod", "production"}

    # ─── Validators (fail closed) ─────────────────────────────────────────

    @field_validator("SECRET_KEY")
    @classmethod
    def _validate_secret_key(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be set to a strong value of at least 32 chars. "
                "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
            )
        lowered = v.lower()
        if any(lowered.startswith(p) for p in _DEV_SECRET_PREFIXES):
            raise ValueError(
                "SECRET_KEY looks like a development placeholder; refusing to start."
            )
        return v

    @field_validator("STRIPE_WEBHOOK_SECRET")
    @classmethod
    def _validate_webhook_secret(cls, v: str, info) -> str:
        # We allow an empty/placeholder secret in dev, but the webhook handler
        # itself fails closed — see services/stripe_service.verify_webhook.
        # In prod we hard-require it here.
        env = (info.data.get("ENV") or "dev").lower()
        if env in {"prod", "production"}:
            if not v or any(v.startswith(p) for p in _PLACEHOLDER_PREFIXES):
                raise ValueError(
                    "STRIPE_WEBHOOK_SECRET must be set to the value from your "
                    "Stripe dashboard when ENV=prod."
                )
        return v
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)


settings = Settings()
