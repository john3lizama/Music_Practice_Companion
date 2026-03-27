# 01 — System Overview

**Who this is for:** Any developer joining this project who needs to understand what it is, why it is built the way it is, and where to start reading the code.

---

## What Is Music Practice Companion?

Music Practice Companion is a backend-first web application that helps musicians improve through AI-generated feedback. A user records themselves practicing — a vocal line, a guitar riff, a full song — uploads the audio file, and the system automatically analyzes it. The analysis evaluates pitch accuracy, timing consistency, and vocal/instrumental stability, then returns a score per metric and plain-English coaching feedback, similar to what a private music tutor would provide.

Beyond private practice, the platform allows users to optionally share any recording publicly. That creates a social feed inspired by Ultimate Guitar's cover feature, where others can like, comment, and follow — combining the feedback loop of a practice journal with the community of a social platform.

---

## Why It Is Built This Way

**Backend first.** The audio analysis logic is the core intellectual value of this product. A frontend can always be added later (and is planned in React/Vite), but the API and analysis engine need to be solid first. Building backend first also means the API is framework-agnostic — any frontend (web, mobile, CLI) can consume it.

**Layered architecture.** The code is split into routes, services, and core layers deliberately. This is not over-engineering for a small project — it is the minimum structure needed to make the audio pipeline testable in isolation, to allow the database to be swapped (e.g., from local to RDS), and to allow storage to be swapped (local files to S3) without rewriting everything else. See `02_architecture.md` for the full rationale.

**Explainable AI first.** The scoring system uses interpretable heuristics (cents deviation, onset spacing) rather than a black-box neural network. This was a deliberate design choice so that every score can be traced back to a specific, measurable audio property. A musician can understand why they scored 72 on pitch. ML models can be layered on top later — see `06_data_pipeline.md`.

**Session-based analysis.** Each analysis run is tied to a specific `PracticeTake` record in the database. Results are stored permanently, not generated on the fly. This enables progress tracking over time, reproducibility for debugging, and the ability to re-render plots without re-running the audio pipeline.

---

## Two Core User Flows

### Private Practice Mode
A user records themselves, uploads the audio, and receives a detailed breakdown — pitch score, timing score, stability score, overall score, and a feedback paragraph per metric. They can make multiple recording attempts ("takes") within a single practice session. All of this is private. Only they can see it.

### Social Mode
At any time, a user can choose to share any take as a public post. That creates a `SocialPost` record linked to the take. Other users can see it in the feed, like it, and comment on it. Sharing is optional and deliberate — the private practice data is never exposed automatically.

---

## Current Build Status

This table is the fastest way to understand what is working and what is still being built.

| Area | Status | Where in Code |
|---|---|---|
| User registration and login | ✅ Complete | `routes/users.py`, `routes/auth.py` |
| JWT authentication (OAuth2 + bcrypt) | ✅ Complete | `oauth2.py`, `utils.py` |
| Practice session CRUD | ✅ Complete | `routes/sessions.py` |
| Votes / likes system | ✅ Complete | `routes/votes.py` |
| PostgreSQL integration (SQLAlchemy) | ✅ Complete | `database/session.py`, `models/__init__.py` |
| Alembic migrations | ✅ Complete | `api/alembic/` |
| pytest test suite | ✅ Complete | `api/tests/` |
| CI/CD pipeline (GitHub Actions) | ✅ Complete | `.github/workflows/build-deploy.yml` |
| Deployment (AWS EC2 + systemd) | ✅ Complete | `.github/workflows/build-deploy.yml` |
| Audio upload endpoint | 🔲 Planned | `routes/uploads.py` (stub) |
| Audio loading and normalization | 🔲 In design | `core/audio_io.py` (empty) |
| Feature extraction (pitch, tempo, stability) | 🔲 In design | `core/features.py` (empty) |
| Scoring engine | 🔲 In design | `core/scoring.py` (empty) |
| Coaching feedback generation | 🔲 In design | `core/feedback.py` (empty) |
| Analysis pipeline orchestration | 🔲 In design | `services/analysis_service.py` (empty) |
| Visualization plots | 🔲 Planned | `core/plots.py` |
| Social posts and comments | 🔲 Planned | Not yet created |
| Follows system | 🔲 Planned | Not yet created |
| Frontend (React / Vite) | 🔲 Planned | `web/` (empty directory) |

---

## Tech Stack — What Each Tool Does and Why It Was Chosen

### Backend Framework
**FastAPI** — chosen over Flask or Django because it natively supports async, auto-generates Swagger UI from type hints, and enforces request/response validation through Pydantic with no extra setup. The interactive docs at `/docs` are critical for testing the API during development.

### Database
**PostgreSQL** — a production-grade relational database that handles the structured relationships between users, sessions, takes, and analysis results. SQLite is used for testing (via `aiosqlite`) so tests run without a real Postgres instance. The database URL is in `api/app/database/session.py`.

**SQLAlchemy ORM** — lets us define database tables as Python classes (`models/__init__.py`) and write queries in Python instead of raw SQL. Alembic handles all schema changes through versioned migration files, which means no manual `ALTER TABLE` commands.

**Pydantic v2** — handles all request/response validation. Every API endpoint declares what it accepts and what it returns using Pydantic schemas (`schemas/schemas.py`). If a client sends bad data, Pydantic rejects it before any database query runs.

### Authentication
**OAuth2 + python-jose** — the login endpoint (`POST /login`) issues a signed JWT token. Every protected route verifies this token via `oauth2.get_current_user()`. The token contains only the user's ID — no sensitive data. Configuration lives in `config.py` and reads from a `.env` file.

**bcrypt / passlib** — passwords are never stored in plain text. `utils.py` contains two functions: `hash_password()` used at registration and `verify()` used at login.

### Audio & Machine Learning
**librosa** — the primary library for audio analysis. It provides pitch tracking (pyin), onset detection, beat tracking, and chromagram computation. See `06_data_pipeline.md` for how each librosa function is used.

**NumPy / SciPy** — used alongside librosa for array math (computing standard deviations, mapping score ranges, processing pitch arrays).

**scikit-learn** — planned for future ML-based scoring models that can be trained on labeled practice recordings.

**matplotlib** — generates the pitch-over-time and onset timing plots that are saved per take and returned to the client.

**ffmpeg** — handles audio format conversion. Users can upload MP3 or M4A files which ffmpeg converts to WAV before librosa processes them. Must be installed as a system dependency (not a pip package).

### DevOps
**GitHub Actions** — every push triggers a CI run that spins up a PostgreSQL container, runs the pytest suite, and if tests pass, SSHs into the EC2 instance to pull the latest code and restart the service. The workflow is in `.github/workflows/build-deploy.yml`.

**AWS EC2** — the deployed server runs Ubuntu. The API process is managed by **systemd**, which keeps it running across reboots and restarts it if it crashes.

---

## Annotated Project Structure

Every file is listed with a one-line explanation of its purpose. If you are new to this codebase, read this section top to bottom before opening any file.

```
Music_Practice_Companion/
│
├── docs/                            ← All system documentation (you are here)
│   ├── 01_system_overview.md        ← This file — start here
│   ├── 02_architecture.md           ← How the layers connect
│   ├── 03_erd.md                    ← Database schema + relationships
│   ├── 04_class_diagram.md          ← ORM models + Pydantic schemas
│   ├── 05_sequence_diagrams.md      ← Request flows step by step
│   └── 06_data_pipeline.md          ← Audio analysis engine design
│
├── .github/
│   └── workflows/
│       └── build-deploy.yml         ← CI/CD: runs tests on push, deploys to EC2 on pass
│
└── api/
    ├── requirements.txt             ← All Python dependencies (pip install -r requirements.txt)
    └── app/
        │
        ├── main.py                  ← FastAPI app instance, CORS config, all router imports
        │                              THIS IS THE ENTRY POINT. Start here if something isn't routing correctly.
        │
        ├── config.py                ← Reads environment variables from .env using Pydantic BaseSettings.
        │                              Add any new env var here first, then use settings.VAR_NAME anywhere.
        │
        ├── oauth2.py                ← JWT creation (create_access_token) and verification (get_current_user).
        │                              get_current_user is used as a FastAPI Depends() on every protected route.
        │
        ├── utils.py                 ← hash_password() and verify(). Called by auth and user routes only.
        │
        ├── database/
        │   ├── session.py           ← SQLAlchemy engine and SessionLocal factory.
        │   │                          get_db() is the dependency injected into every route that needs the DB.
        │   │                          The DATABASE_URL is built from settings in config.py.
        │   └── user.py              ← Reserved for future user database abstraction layer (currently unused).
        │
        ├── models/
        │   └── __init__.py          ← SQLAlchemy ORM table definitions. One class = one database table.
        │                              Every column, foreign key, and relationship is defined here.
        │                              If you need to add a column, add it here then create an Alembic migration.
        │
        ├── schemas/
        │   └── schemas.py           ← Pydantic request/response schemas. NOT the same as models.
        │                              Models = database shape. Schemas = API shape.
        │                              A route uses a schema to validate input and shape its output.
        │
        ├── routes/                  ← One file per domain. Each file is an APIRouter mounted in main.py.
        │   ├── auth.py              ← POST /login — returns a JWT token.
        │   ├── users.py             ← GET/POST/DELETE /users — user account management.
        │   ├── sessions.py          ← GET/POST/PUT/DELETE /sessions — practice session CRUD.
        │   ├── votes.py             ← POST /votes — like or unlike a session.
        │   └── uploads.py           ← (Planned) POST /practice/sessions/{id}/takes — audio upload.
        │
        ├── services/
        │   └── analysis_service.py  ← (Planned) Orchestrates the full audio pipeline.
        │                              This is the only file that knows about both core audio logic AND the DB.
        │                              Routes call this. Core functions do not.
        │
        └── core/                    ← Pure audio logic. ZERO FastAPI or database imports allowed here.
            ├── audio_io.py          ← (Planned) Load, convert, and normalize audio files.
            ├── features.py          ← (Planned) Extract pitch, onset times, tempo, stability, and key.
            ├── scoring.py           ← (Planned) Convert extracted features into 0–100 scores.
            ├── feedback.py          ← (Planned) Convert scores into plain-English coaching text.
            └── plots.py             ← (Planned) Generate pitch and onset visualization PNGs.
```

---

## How to Run Locally

```bash
# 1. Install system dependency (macOS)
brew install ffmpeg

# 2. Set up Python environment
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Create a .env file in api/ with these variables:
#    DATABASE_HOSTNAME, DATABASE_USERNAME, DATABASE_PASSWORD,
#    DATABASE_PORT, DATABASE_NAME, SECRET_KEY, ALGORITHM,
#    ACCESS_TOKEN_EXPIRE_MINUTES

# 4. Start the server
uvicorn app.main:app --reload

# 5. Open interactive API docs
# http://127.0.0.1:8000/docs
```

---

## Where to Start If You Are New to This Codebase

Start with these files in this order:

1. `main.py` — understand how the app is assembled and which routers are registered
2. `database/session.py` — understand how the database connection is made
3. `models/__init__.py` — understand what tables exist and how they relate
4. `schemas/schemas.py` — understand what the API accepts and returns
5. `routes/auth.py` + `oauth2.py` — understand how authentication works end-to-end
6. `routes/sessions.py` — understand a full CRUD route with auth protection
7. `docs/06_data_pipeline.md` — read the audio pipeline design before touching any `core/` file

---

## Key Design Principles

**Separation of Concerns** — Routes handle HTTP only (read params, call a function, return a response). Services orchestrate business logic. Core contains pure functions with no framework dependencies. This makes each layer independently testable, replaceable, and easy to reason about in isolation.

**Explainable AI First** — Every score can be explained in terms of measurable audio properties. A 68 pitch score means the average pitch deviation was X cents from the nearest note. This is intentional — musicians need to trust the feedback, and trust requires transparency.

**Session-Based Reproducibility** — Analysis results are stored in the database tied to a specific take. If the scoring algorithm changes, old takes are not affected. If a bug is found in a plot, the audio can be re-processed without re-uploading.

**Expandability by Design** — Local file storage is referenced as a path string, so swapping to S3 means changing one function in `audio_io.py`. Synchronous analysis can become async (Celery + Redis) by wrapping `analyze_take()` in a task queue without changing any route logic. These seams are intentional.
