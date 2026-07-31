import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import analyze, auth, password_reset, practice, sessions, users, votes

# Optional error tracking — enabled only when SENTRY_DSN is set.
if settings.SENTRY_DSN:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)
    except ImportError:
        logging.getLogger(__name__).warning(
            "SENTRY_DSN set but sentry-sdk not installed (pip install sentry-sdk)"
        )

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="MusicVJN API")

# CORS — explicit origins only (wildcard + credentials lets any website make
# authenticated requests against the API). Configure via CORS_ORIGINS in .env.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,  # we use Bearer headers, not cookies
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "MusicVJN API"}


app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(votes.router)
app.include_router(analyze.router)
app.include_router(practice.router)
app.include_router(password_reset.router)
