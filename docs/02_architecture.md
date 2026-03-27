# 02 — System Architecture

**Who this is for:** A developer who needs to understand how the application layers connect, why they are separated the way they are, and what the rules are for where logic belongs.

---

## Why Architecture Matters Here

This project has two distinct concerns that could easily get tangled together: **web API logic** (HTTP, auth, routing) and **audio processing logic** (signal processing, scoring, feedback). If these mix into the same files, the result is code that is impossible to test independently, impossible to swap out, and extremely hard to debug.

The layered architecture exists to enforce a clear boundary between them. A route file never does math on audio. A core function never touches the database. When something breaks, you know exactly which layer to look in.

---

## Component Diagram

This diagram shows every major component in the system and how they depend on each other. The arrow direction means "depends on" or "calls." Notice that dependencies only point inward — a route calls a service, a service calls core functions. Nothing calls backward.

```mermaid
graph TD
    CLIENT["🌐 Client\n(Browser / Mobile App)\n\nSends HTTP requests with\nJSON bodies and Bearer tokens"]

    subgraph FASTAPI["FastAPI Application — api/app/"]
        direction TB

        subgraph ROUTES["Routes Layer — api/app/routes/\n(HTTP only — reads params, calls services, returns responses)"]
            R_AUTH["auth.py\nPOST /login\nIssues JWT tokens"]
            R_USERS["users.py\nUser CRUD\nGET, POST, DELETE /users"]
            R_SESSIONS["sessions.py\nSession CRUD\nGET, POST, PUT, DELETE /sessions"]
            R_VOTES["votes.py\nPOST /votes\nLike or unlike a session"]
            R_UPLOADS["uploads.py ⬜\nPOST /practice/sessions/{id}/takes\nAudio file upload (planned)"]
        end

        subgraph SERVICES["Services Layer — api/app/services/\n(Orchestration — coordinates core + DB, handles state)"]
            S_ANALYSIS["analysis_service.py ⬜\nanalyze_take(take_id, db)\nOrchestrates full audio pipeline (planned)"]
        end

        subgraph CORE["Core Layer — api/app/core/\n(Pure logic — NO FastAPI imports, NO DB imports)"]
            C_IO["audio_io.py ⬜\nLoad, convert, normalize audio\nOutputs: (y, sr) waveform"]
            C_FEAT["features.py ⬜\nExtract pitch, onsets, tempo,\nstability, key"]
            C_SCORE["scoring.py ⬜\nConvert features to 0–100 scores\npitch, timing, stability, overall"]
            C_FEED["feedback.py ⬜\nConvert scores to coaching text\nReturns feedback dict"]
            C_PLOTS["plots.py ⬜\nGenerate pitch.png and onsets.png\nSaved per take"]
        end

        subgraph CROSS["Cross-Cutting — api/app/\n(Used across multiple layers)"]
            OAUTH["oauth2.py\nJWT create + verify\nget_current_user() Depends()"]
            UTILS["utils.py\nhash_password()\nverify()"]
            CONFIG["config.py\nPydantic BaseSettings\nReads from .env file"]
        end

        subgraph DATA["Data Layer — api/app/models/ + schemas/ + database/"]
            MODELS["models/__init__.py\nSQLAlchemy ORM classes\nOne class per DB table"]
            SCHEMAS["schemas/schemas.py\nPydantic request/response models\nValidation + serialization"]
            DBSESS["database/session.py\nSQLAlchemy engine\nget_db() session factory"]
        end
    end

    subgraph INFRA["Infrastructure"]
        DB[("PostgreSQL\nAll relational data\nUsers, Sessions, Votes,\nAnalysis Results")]
        FILES["File Storage\nlocal /outputs (dev)\nS3 (planned for prod)"]
        CICD["GitHub Actions\nbuild-deploy.yml\nRuns tests → deploys"]
        EC2["AWS EC2\nUbuntu server\nsystemd process manager"]
    end

    CLIENT -->|"HTTPS + Bearer token"| ROUTES
    ROUTES -->|"Depends(get_current_user)"| OAUTH
    ROUTES -->|"calls service or queries DB directly"| SERVICES
    ROUTES -->|"Depends(get_db)"| DBSESS
    SERVICES -->|"calls in sequence"| CORE
    SERVICES -->|"reads and writes"| DBSESS
    DBSESS -->|"SQLAlchemy queries"| DB
    CORE -->|"saves files"| FILES
    OAUTH -->|"reads"| CONFIG
    DBSESS -->|"reads"| CONFIG
    CICD -->|"SSH + git pull + restart"| EC2
    EC2 -->|"runs"| FASTAPI
```

---

## Layer Rules — Where Logic Belongs

This is the most important section for any developer adding new features. Putting logic in the wrong layer is the most common mistake in this codebase.

### Routes Layer — `api/app/routes/`

**Purpose:** The routes layer is the HTTP boundary. Its only job is to translate between HTTP and Python — reading request parameters, validating input, calling the right function, and formatting the response.

**What belongs here:**
- Reading path parameters, query parameters, and request bodies
- Calling `Depends(get_current_user)` for authentication
- Calling `Depends(get_db)` to get a database session
- Calling a service function or making a simple database query
- Raising `HTTPException` for 404, 403, 409 errors
- Returning response data

**What does NOT belong here:**
- Any audio processing logic
- Any business rules or calculations
- Direct calls to librosa, NumPy, or any audio library
- Complex multi-step database operations

**Example:** `api/app/routes/sessions.py` handles GET/POST/PUT/DELETE for sessions. The route reads the request, validates the user's token, queries the database, and returns. No audio logic anywhere.

---

### Services Layer — `api/app/services/`

**Purpose:** Services are the orchestration layer — they coordinate multiple steps that need to happen in a specific order. The key rule is that this is the ONLY layer that knows about both core audio functions AND the database. Routes don't touch audio. Core doesn't touch the database. Services bridge them.

**What belongs here:**
- Calling core functions in the right sequence
- Updating database records to reflect processing state (e.g., setting take status to "processing")
- Persisting results after core functions complete
- Error handling and cleanup (e.g., marking a take as "failed" if audio processing crashes)
- Coordinating file I/O paths between upload storage and core processing

**What does NOT belong here:**
- Any HTTP-specific logic (no `Request`, `Response`, `HTTPException`)
- The actual audio math (that lives in `core/`)

**Example:** `analysis_service.py` will call `audio_io.load_audio()`, then `features.extract_pitch()`, then `scoring.score_pitch()`, then `feedback.generate_all_feedback()`, then save everything to the database. It orchestrates — it does not compute.

---

### Core Layer — `api/app/core/`

**Purpose:** Pure functions. Every function in `core/` takes data in and returns data out — no side effects, no database calls, no HTTP context. This is deliberate. It means every core function can be unit tested with a single assert statement, imported into a Jupyter notebook for exploration, or replaced entirely without touching any route or service.

**What belongs here:**
- Audio loading and normalization
- Signal processing (pitch extraction, onset detection, beat tracking)
- Score computation (math on audio features)
- Feedback generation (string logic based on scores)
- Plot generation (matplotlib output to file)

**What does NOT belong here:**
- `from fastapi import ...` — never
- `from sqlalchemy import ...` — never
- Any database query
- Any HTTP response logic

**Example:** `features.extract_pitch(y, sr)` takes a waveform array and returns a pitch array. It doesn't care where the audio came from, who uploaded it, or what happens to the result. It just computes.

---

### Data Layer — `api/app/models/`, `api/app/schemas/`, `api/app/database/`

**Why models and schemas are separate — this is a common point of confusion.**

Models (`models/__init__.py`) define what the database looks like. They use SQLAlchemy and map directly to PostgreSQL tables. You use a model when reading from or writing to the database.

Schemas (`schemas/schemas.py`) define what the API looks like. They use Pydantic and define what the client can send and what they receive back. You use a schema as a route's `response_model` or as the type of a request body parameter.

These are intentionally different because the database shape and the API shape are not always the same thing. The database stores a hashed password — the API should never return it. The database stores a raw `feedback` string (JSON) — the API should return it as a structured `FeedbackOut` object. Keeping them separate means these transformations are explicit and controlled.

The database session factory lives in `database/session.py`. The `get_db()` function there is a FastAPI dependency that creates a database session per request and closes it when the request finishes, regardless of whether it succeeded or failed.

---

## Deployment Architecture

**Why this pipeline matters:** The CI/CD setup means that no one manually SSHes into the server to deploy. Every push to `main` that passes tests is automatically deployed. This prevents the "it works on my machine" problem and ensures the deployed code always matches the tested code.

```mermaid
graph LR
    DEV["👨‍💻 Developer\ngit push to main"]

    subgraph GH["GitHub Actions — .github/workflows/build-deploy.yml"]
        direction TB
        SPIN["Step 1: Spin up\nPostgreSQL container\nMatches production DB"]
        TEST["Step 2: Install dependencies\nRun pytest suite\nFails here = no deploy"]
        DEPLOY["Step 3: SSH into EC2\ngit fetch + git reset --hard origin/main\nsystemctl restart api"]
    end

    subgraph AWS["AWS EC2 — Ubuntu Server"]
        direction TB
        SYSTEMD["systemd\nKeeps API running\nAuto-restarts on crash\nSurvives reboots"]
        UVICORN["uvicorn app.main:app\nPython ASGI server\nRuns the FastAPI app"]
        PG[("PostgreSQL\nRelational database\nAll persistent data")]
    end

    DEV -->|"push"| SPIN
    SPIN --> TEST
    TEST -->|"all tests pass"| DEPLOY
    DEPLOY -->|"SSH command"| SYSTEMD
    SYSTEMD --> UVICORN
    UVICORN --> PG
```

**Why systemd instead of Docker?** Docker deployment is scaffolded in the CI/CD file (commented out) for a future enhancement. For now, systemd is simpler to configure, easier to debug on a single server, and sufficient for the current scale. When traffic grows or the deployment needs to be containerized, Docker can be enabled by uncommenting those steps in `build-deploy.yml`.

---

## What ⬜ Means Throughout the Docs

Files and components marked with ⬜ are **designed and documented but not yet implemented**. Their location in the codebase is established (the file exists), their interface is designed (inputs and outputs are defined in `06_data_pipeline.md`), and their role in the architecture is clear. They are ready to be built. See `06_data_pipeline.md` for the implementation spec.
