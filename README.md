# 🎶 MusicVJN

> **Music, with vision.** An AI-powered music practice assistant that analyzes vocal and instrumental performances using audio signal processing and machine learning. (Formerly "AI Music Practice Companion" — VJN is short for *vision*.)

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-framework-009688?logo=fastapi)
![Status](https://img.shields.io/badge/Status-Pre--launch%20%E2%80%94%20no%20live%20deploy%20target-orange)
![License](https://img.shields.io/badge/License-Educational-lightgrey)

---

## 📌 Overview

**MusicVJN** is a portfolio-ready, end-to-end audio analysis system designed to help musicians improve through data-driven feedback. Users upload audio recordings (vocals or guitar), and the system evaluates pitch accuracy, timing consistency, and vocal stability — returning scores, visualizations, and plain-English coaching tips.

**Where things stand:** the API is backend-first and battle-tested (112 pytest cases). The frontend (Expo/React Native, one codebase for web + iOS/Android) is a fully interactive app — auth, song catalog, a real practice player with audio playback/seeking/lyrics, and the analysis flow are all built and covered by 36 Playwright end-to-end tests. What's **not** done: there's no live server right now (the old EC2 box was torn down — see [Status & what's left before deployment](#-status--whats-left-before-deployment)), and the song catalog / social feed are still backed by mock data pending a real content pipeline. See [Screenshots](#-screenshots) below for the current state of every screen (note: captured before the practice player's audio/lyrics/volume work — due for a refresh).

---

## ✨ Features

**Analysis pipeline (backend)**
- 🎵 Upload audio recordings (WAV recommended; MP3/M4A supported via ffmpeg)
- 🔄 Automatic audio preprocessing — mono conversion and resampling
- 🎼 Pitch tracking for both singing and guitar
- 🥁 Tempo and onset detection for timing analysis
- 📊 Vocal stability analysis for sustained notes
- 🔢 Numeric practice scores: Pitch Accuracy, Timing Consistency, Vocal Stability
- 📈 Auto-generated visualizations: pitch-over-time and onset timing plots
- 💾 Session-based results saved to disk (reproducible outputs)
- 📖 Interactive API documentation via Swagger UI
- 🔐 JWT auth, per-user session ownership, rate-limited login, password reset

**Practice player (frontend)**
- ▶️ Real audio playback (synthesized placeholder pads per song, chord-accurate — no licensed audio wired up yet), play/pause, ±10s skip, draggable/clickable seek bar
- 🎤 Spotify-style line-by-line lyrics that auto-scroll and seek on tap
- 🎸 Chord progression display synced to the audio, tempo (real playback-rate change) and transpose controls
- 🔊 Volume control with a reserved layout slot (no shifting on hover) and a touch-friendly always-visible fallback on mobile
- 📱 Responsive: two-column desktop layout (fits without scrolling on wide viewports) vs. single-column mobile layout

---

## 📸 Screenshots

Every screen in the app, captured from a production web build against a seeded demo account.

### Marketing / auth

| Landing page | Sign in |
|---|---|
| ![Landing page](docs/screenshots/01-index.png) | ![Sign in](docs/screenshots/02-login.png) |

| Create account | Forgot password |
|---|---|
| ![Create account](docs/screenshots/03-register.png) | ![Forgot password](docs/screenshots/04-forgot-password.png) |

### Core app

| Discover | Analyze |
|---|---|
| ![Discover](docs/screenshots/05-home.png) | ![Analyze](docs/screenshots/06-analyze.png) |

| Feed | Profile |
|---|---|
| ![Feed](docs/screenshots/07-feed.png) | ![Profile](docs/screenshots/08-profile.png) |

### Song + practice flow

| Song detail | Practice player |
|---|---|
| ![Song detail](docs/screenshots/09-song-detail.png) | ![Practice player](docs/screenshots/10-practice-player.png) |

### Legal

| Privacy policy | Terms of service |
|---|---|
| ![Privacy policy](docs/screenshots/11-legal-privacy.png) | ![Terms of service](docs/screenshots/12-legal-terms.png) |

---

## 🧠 How It Works

1. **Upload** — User submits an audio file via the `/api/analyze` endpoint
2. **Preprocess** — Audio is normalized to mono and resampled for consistency
3. **Analyze** — Core signal processing extracts pitch, onsets, tempo, and stability metrics
4. **Score** — Explainable heuristics convert raw features into practice scores
5. **Feedback** — Scores are translated into plain-English coaching tips
6. **Save** — All results (JSON + plots) are persisted to a unique session folder

Each analysis run produces a fully reproducible session folder under `api/app/outputs/sessions/<session_id>/`.

---

## 🛠️ Tech Stack

### Backend
| Library       | Purpose                          |
|---------------|----------------------------------|
| Python 3      | Core language                    |
| FastAPI       | API framework                    |
| librosa       | Audio feature extraction         |
| NumPy / SciPy | Signal processing                |
| matplotlib    | Visualization                    |
| ffmpeg        | Audio format conversion          |
| Pydantic      | Data validation & API schemas    |

### Frontend
| Library         | Purpose                          |
|-----------------|-----------------------------------|
| Expo / React Native | Cross-platform app (web + iOS/Android) |
| expo-router     | File-based navigation             |
| expo-av         | Practice-player audio playback    |
| TypeScript      | Type-safe components + API client |
| Playwright      | End-to-end tests for the web build (36 specs) |

---

## 📁 Project Structure

```
Music_Practice_Companion/
├── api/
│   ├── requirements.txt
│   ├── alembic/                     # DB migrations
│   ├── deploy/, Dockerfile          # container + systemd deploy assets
│   └── app/
│       ├── main.py                  # FastAPI app entry point
│       ├── routes/                  # auth, users, sessions, votes, analyze, practice, password_reset
│       ├── services/
│       │   └── analysis_service.py  # Orchestrates analysis pipeline
│       ├── core/                    # audio_io, features, scoring, feedback, plots, compare
│       ├── storage/                 # session folder read/write (traversal-safe IDs)
│       ├── schemas/, models/        # Pydantic DTOs + SQLAlchemy models
│       └── outputs/, uploads/       # generated session data (gitignored)
├── frontend/
│   ├── app/                         # Expo Router screens (see frontend/README.md for the route table)
│   ├── src/
│   │   ├── api.ts                   # real fetch calls, mock-data fallback when API unreachable
│   │   ├── mockData.ts, lyrics.ts   # song catalog + placeholder lyrics (mock, pending real content)
│   │   ├── audio.ts                 # placeholder practice-player audio (per-song, chord-accurate loops)
│   │   └── components/              # ui.tsx (Button/GlassCard/Seekbar/…), charts.tsx, Background.tsx
│   ├── assets/audio/                # synthesized placeholder pads (~60-70KB each, no licensed audio)
│   └── tests/                       # Playwright specs
├── deploy/                          # Caddyfile, systemd unit for the API
├── docs/                            # architecture diagrams + screenshots
└── .github/workflows/               # CI (test + build); deploy job currently disabled — see DEPLOYMENT.md
```

> **Architecture principle:** `routes/` handles HTTP only → `services/` orchestrates logic → `core/` contains pure, testable functions. No FastAPI imports in `core/`. See `ARCHITECTURE.md` for the full system diagram and scaling plan.

---

## 🚀 Getting Started

The fastest path is the unified dev script — see `DEV.md`:

```bash
git clone https://github.com/john3lizama/Music_Practice_Companion.git
cd Music_Practice_Companion
source ./activate.sh        # sets up + activates both the Python venv and frontend deps
mpc-backend                  # terminal 1: FastAPI  → http://127.0.0.1:8000/docs
mpc-frontend                  # terminal 2: Expo web → http://localhost:8081
```

Manual setup instructions follow below if you'd rather not use the script.

### Prerequisites

- Python 3.10+ (3.13 recommended)
- [ffmpeg](https://ffmpeg.org/) installed on your system
- Node 18+ (for the frontend)

### Installation

```bash
# Clone the repository
git clone https://github.com/john3lizama/Music_Practice_Companion.git
cd Music_Practice_Companion/api

# Install ffmpeg (macOS)
brew install ffmpeg

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### Running the API

```bash
uvicorn app.main:app --reload
```

Then open **http://127.0.0.1:8000/docs** to access the Swagger UI and test the `/api/analyze` endpoint by uploading an audio file.

---

## ✅ Testing

```bash
make test                                    # backend: 112 pytest cases, in-memory SQLite, no Postgres needed
cd frontend && npx playwright test           # frontend: 36 Playwright end-to-end specs against the web build
```

Backend coverage: the analysis pipeline, every API route, and security regressions (auth, ownership, upload validation, rate limiting, CORS, JWT). Frontend coverage: auth flows, catalog search/filter, the full practice player (playback, seek/skip, chord sync, lyrics, volume, responsive layout), analyze flow, and feed.

---

## 📊 Example Output

Each analysis session returns:

| File           | Description                              |
|----------------|------------------------------------------|
| `result.json`  | Scores, metadata, and feedback text      |
| `pitch.png`    | Pitch-over-time visualization            |
| `onsets.png`   | Timing and onset visualization           |

**Example feedback messages:**
- *"Pitch is generally stable but drifts during sustained notes."*
- *"Timing inconsistency detected — try practicing with a metronome."*

---

## 🧩 Design Philosophy

- **Explainable AI first** — simple, interpretable metrics over black-box models
- **Clean separation of concerns** — API / services / core logic are fully decoupled
- **Session-based outputs** — every run is reproducible and independently inspectable
- **Expandable architecture** — the web UI already plugs in via `api.ts`; real ML models are next (see `ML_AGENTIC_LEARNING_PLAN.md`)

---

## 🔮 Roadmap

**Done**
- [x] Web UI for uploading audio and browsing session history (Analyze screen + practice history)
- [x] User accounts, JWT auth, password reset
- [x] Practice player: real playback, seek/skip, tempo/transpose, chord-synced lyrics, volume
- [x] CI pipeline (pytest + pip-audit + frontend build/Playwright) — deploy stage built but currently disabled, see below

**Not done**
- [ ] A live deploy target (see [Status & what's left before deployment](#-status--whats-left-before-deployment))
- [ ] Real song catalog + social feed backend (currently mock data)
- [ ] Real-time recording directly in the browser
- [ ] ML-based scoring models to replace heuristics (full curriculum in `ML_AGENTIC_LEARNING_PLAN.md`)
- [ ] Personalized practice recommendations over time
- [ ] Support for reference tracks and backing tracks

---

## 🚦 Status & what's left before deployment

The app runs end-to-end locally (backend + frontend, real auth/analyze wired up) but **there is currently no live server** — the previous EC2 box was torn down, and the CI/CD pipeline's push trigger and deploy job are both intentionally disabled (`.github/workflows/build-deploy.yml`, `workflow_dispatch`/PR-only for now). Full runbook: **`DEPLOYMENT.md`**. Short version of what's left:

1. **Provision a target** — a new EC2 box (or equivalent) and point DNS at it; the systemd unit + Caddyfile in `deploy/` are ready to use as-is.
2. **Rotate secrets** — new `SECRET_KEY` and DB password; never reuse anything that touched the old box.
3. **Re-enable CI/CD** — restore the push trigger and flip the `Deploy` job's `if: false` back to real conditions once step 1 is done.
4. **Run through the launch checklist in `DEPLOYMENT.md`** — DNS, TLS certs, Alembic migration, smoke test, Sentry + uptime monitoring.
5. **Decide on the mock content** — song catalog and social feed are still `mockData.ts`; either ship them clearly labeled as a demo/preview, or wire up real content before launch.

---

## 👤 Author

**John Lizama**
Computer Science (AI/ML) — George Mason University
[GitHub](https://github.com/john3lizama)

---

## 📄 License

This project is intended for educational and portfolio purposes.
