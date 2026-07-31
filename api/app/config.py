from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_HOSTNAME: str
    DATABASE_USERNAME: str
    DATABASE_PASSWORD: str
    DATABASE_PORT: str
    DATABASE_NAME: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Analysis pipeline
    MAX_UPLOAD_MB: int = 25
    SESSIONS_DIR: str = "app/outputs/sessions"

    # Comma-separated allowed CORS origins (no wildcard in production)
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:19006"

    # Email + password reset (RESEND_API_KEY empty = log emails instead)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "MusicVJN <noreply@musicvjn.com>"
    FRONTEND_URL: str = "http://localhost:8081"
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Observability (empty = disabled)
    SENTRY_DSN: str = ""

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
