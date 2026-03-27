# 01 — System Overview

## What This Is

Music Practice Companion is a backend-first web application that helps musicians improve through AI-generated feedback. A user uploads an audio recording of their practice, and the system analyzes it — evaluating pitch accuracy, timing consistency, and vocal stability — then returns actionable coaching feedback, like a private tutor would.

Beyond private practice, the platform allows users to optionally share recordings publicly in a social feed inspired by Ultimate Guitar's cover feature and the short-form video style of TikTok and Instagram Reels. Other users can like, comment, and follow.

---

## Two Core Modes

**Private Practice Mode**
A user records themselves practicing a song or exercise. They upload the audio, receive a score and written feedback per metric, and can track improvement across multiple attempts (called "takes") within a session. All of this is private to the user by default.

**Social Mode**
A user can choose to share any take publicly. That recording becomes a post in the public feed. Other users can interact with it through likes, comments, and follows.

---

## Current State of the System

The backend foundation is complete and deployed. The audio analysis pipeline is in design and development.

| Area | Status |
|---|---|
| User registration and login | ✅ Built |
| JWT authentication (OAuth2 + bcrypt) | ✅ Built |
| Practice session CRUD | ✅ Built (generic — needs domain refactor) |
| Votes / likes system | ✅ Built |
| CI/CD pipeline (GitHub Actions + pytest) | ✅ Built |
| Deployment (AWS EC2 + systemd) | ✅ Built |
| Audio upload endpoint | 🔲 Planned |
| Audio feature extraction (pitch, tempo, stability) | 🔲 In design |
| Scoring engine | 🔲 In design |
| Coaching feedback generation | 🔲 In design |
| Social posts and comments | 🔲 Planned |
| Follows system | 🔲 Planned |
| Frontend (React / Vite) | 🔲 Planned |

---

## Tech Stack

**Backend**
- Python 3.13
- FastAPI — REST API framework
- PostgreSQL — relational database
- SQLAlchemy ORM — database interaction
- Alembic — database migrations
- Pydantic v2 — request/response validation

**Authentication**
- OAuth2PasswordBearer
- python-jose — JWT creation and verification
- bcrypt / passlib — password hashing

**Audio & ML**
- librosa — audio feature extraction
- NumPy / SciPy — signal processing
- scikit-learn — planned ML scoring models
- matplotlib — visualization plots
- ffmpeg — audio format conversion (WAV, MP3, M4A)

**DevOps**
- GitHub Actions — CI/CD pipeline
- pytest — automated testing
- AWS EC2 — cloud deployment
- systemd — process management

---

## Project Structure

```
Music_Practice_Companion/
├── docs/                        ← You are here
│   ├── 01_system_overview.md
│   ├── 02_architecture.md
│   ├── 03_erd.md
│   ├── 04_class_diagram.md
│   ├── 05_sequence_diagrams.md
│   └── 06_data_pipeline.md
│
├── api/
│   ├── requirements.txt
│   └── app/
│       ├── main.py              ← FastAPI app entry point, CORS, router registration
│       ├── config.py            ← Environment variable settings (Pydantic BaseSettings)
│       ├── oauth2.py            ← JWT creation and verification
│       ├── utils.py             ← Password hashing utilities
│       │
│       ├── database/
│       │   ├── session.py       ← SQLAlchemy engine, SessionLocal, get_db()
│       │   └── user.py          ← (Reserved for future user DB abstraction)
│       │
│       ├── models/
│       │   └── __init__.py      ← SQLAlchemy ORM table definitions
│       │
│       ├── schemas/
│       │   └── schemas.py       ← Pydantic request/response schemas
│       │
│       ├── routes/
│       │   ├── auth.py          ← POST /login
│       │   ├── users.py         ← User CRUD
│       │   ├── sessions.py      ← Session CRUD
│       │   ├── votes.py         ← Like / unlike
│       │   └── uploads.py       ← (Planned) Audio file upload
│       │
│       ├── services/
│       │   └── analysis_service.py  ← (Planned) Audio pipeline orchestrator
│       │
│       └── core/
│           ├── audio_io.py      ← (Planned) Load, convert, normalize audio
│           ├── features.py      ← (Planned) Pitch, onset, tempo, stability extraction
│           ├── scoring.py       ← (Planned) Convert features → 0–100 scores
│           ├── feedback.py      ← (Planned) Convert scores → coaching text
│           └── plots.py         ← (Planned) Generate pitch and onset visualizations
│
└── .github/
    └── workflows/
        └── build-deploy.yml     ← CI/CD: test on push, deploy to EC2
```

---

## Key Design Principles

**Separation of Concerns** — Routes handle HTTP only. Services orchestrate. Core contains pure logic with no framework imports. This makes each layer independently testable and replaceable.

**Explainable AI First** — Scoring and feedback are built on interpretable heuristics before any ML model is introduced. Every score can be traced back to a measurable audio property.

**Session-Based Reproducibility** — Each analysis run produces a result record tied to a specific take. Results are stored and retrievable — not ephemeral.

**Expandable Architecture** — Local file storage can be swapped for S3. Synchronous analysis can be swapped for an async job queue (Celery + Redis). The interfaces are designed to support this without rewiring the rest of the system.
