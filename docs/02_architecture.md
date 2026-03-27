# 02 — System Architecture

## Component Diagram

This diagram shows the high-level layers of the system and how they relate to each other. Arrows represent the direction of dependency — a layer only calls inward, never outward.

```mermaid
graph TD
    CLIENT["🌐 Client\n(Browser / Mobile App)"]

    subgraph FASTAPI["FastAPI Application"]
        direction TB

        subgraph ROUTES["Routes Layer\n(HTTP only — reads params, returns responses)"]
            R_AUTH["auth.py\nPOST /login"]
            R_USERS["users.py\nUser CRUD"]
            R_SESSIONS["sessions.py\nSession CRUD"]
            R_VOTES["votes.py\nLike / Unlike"]
            R_UPLOADS["uploads.py\n⬜ Audio Upload (planned)"]
        end

        subgraph SERVICES["Services Layer\n(Orchestration — coordinates core + DB)"]
            S_ANALYSIS["analysis_service.py\n⬜ Audio pipeline orchestrator (planned)"]
        end

        subgraph CORE["Core Layer\n(Pure logic — no FastAPI, no DB imports)"]
            C_IO["audio_io.py\n⬜ Load / convert / normalize"]
            C_FEAT["features.py\n⬜ Pitch / onset / tempo / stability"]
            C_SCORE["scoring.py\n⬜ Features → 0–100 scores"]
            C_FEED["feedback.py\n⬜ Scores → coaching text"]
            C_PLOTS["plots.py\n⬜ Pitch + onset visualizations"]
        end

        subgraph CROSS["Cross-Cutting"]
            OAUTH["oauth2.py\nJWT creation + verification"]
            UTILS["utils.py\nPassword hashing"]
            CONFIG["config.py\nEnvironment settings"]
        end
    end

    subgraph INFRA["Infrastructure"]
        DB[("PostgreSQL\n(AWS RDS / local)")]
        FILES["File Storage\n(local /outputs → S3 later)"]
        CICD["GitHub Actions\nCI/CD Pipeline"]
        EC2["AWS EC2\nsystemd process"]
    end

    CLIENT -->|"HTTPS requests"| ROUTES
    ROUTES -->|"calls"| SERVICES
    ROUTES -->|"calls"| CROSS
    SERVICES -->|"orchestrates"| CORE
    SERVICES -->|"reads/writes"| DB
    CORE -->|"saves plots"| FILES
    CICD -->|"runs tests\nthen deploys"| EC2
```

---

## Layer Responsibilities

| Layer | Files | Rule |
|---|---|---|
| **Routes** | `routes/*.py` | HTTP only. Read request params, call a service or query, return a response. No business logic. |
| **Services** | `services/*.py` | Glue code. Coordinate core functions in the right order. Persist results. Handle status updates. |
| **Core** | `core/*.py` | Pure functions. Audio math, scoring logic, feedback rules. Zero FastAPI or SQLAlchemy imports. |
| **Models** | `models/__init__.py` | SQLAlchemy ORM table definitions. One class per database table. |
| **Schemas** | `schemas/schemas.py` | Pydantic models for request/response validation and serialization. |
| **Cross-Cutting** | `oauth2.py`, `utils.py`, `config.py` | Auth, hashing, and environment config used across multiple layers. |

---

## Deployment Architecture

```mermaid
graph LR
    DEV["👨‍💻 Developer\npushes to GitHub"]

    subgraph GH["GitHub Actions CI/CD"]
        TEST["1. Spin up\nPostgreSQL container"]
        PYTEST["2. Run pytest\n(routes, auth, DB)"]
        SSH["3. SSH into EC2\ngit pull + restart"]
    end

    subgraph AWS["AWS EC2 Instance"]
        SYSTEMD["systemd service\n(keeps API running)"]
        API["FastAPI app\n(uvicorn)"]
        PGDB[("PostgreSQL\ndatabase")]
    end

    DEV -->|"git push"| GH
    TEST --> PYTEST --> SSH
    SSH -->|"automated deploy"| SYSTEMD
    SYSTEMD --> API
    API --> PGDB
```

---

## What ⬜ Means

Files marked with ⬜ are **designed but not yet implemented**. Their interfaces and responsibilities are defined in the documentation and scaffolded in the codebase. See `06_data_pipeline.md` for the full design of the audio core layer.
