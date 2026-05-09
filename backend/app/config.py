from pydantic_settings import BaseSettings
from pydantic import Field, AliasChoices
from typing import List


class Settings(BaseSettings):
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

    # Stripe Payments
    STRIPE_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder"

    # Auth
    SECRET_KEY: str = "safetable-dev-secret-key-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
