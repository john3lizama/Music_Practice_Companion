music-practice-ai/
  README.md
  .gitignore
  docker/                     # optional later
  api/
    requirements.txt
    .venv/                    # local only (gitignored)
    app/
      main.py
      routes/
        analyze.py
        sessions.py
      services/
        analysis_service.py
      core/
        audio_io.py
        features.py
        scoring.py
        feedback.py
        plots.py
      models/                 # pydantic response/request schemas (add soon)
        schemas.py
      storage/
        __init__.py
      outputs/
        sessions/             # generated (gitignored)
  web/                        # add later (React/Vite)
    (empty for now)



routes/ = “API endpoints only” (thin layer)

services/ = orchestration (“what happens when analyze runs”)

core/ = pure logic (audio/features/scoring) → easiest to test and reuse

models/ = request/response schemas (keeps API clean)

outputs/ = generated files (never committed)


✅ routes/

Only HTTP stuff:

reading params

validating inputs

returning responses

No audio logic here.

✅ services/

Glue code:

create session folder

call core functions in the right order

save JSON/plots

return final result dict

✅ core/

“Pure functions”:

load_audio_any()

compute_pitch_track()

score_pitch()

save_pitch_plot()

No FastAPI imports here.

✅ outputs/

Generated at runtime:

uploads

converted wav

result.json

pitch.png

onsets.png

This should always be gitignored.

--------------------------------------------------------------------------------------------------------

# 🎶 AI Music Practice Companion

An **AI-powered music practice assistant** that analyzes **vocal and guitar performances** using audio signal processing and machine learning techniques. The system evaluates **pitch accuracy, timing consistency, and vocal stability**, then generates **actionable feedback** to help musicians practice more effectively.

This project is designed as a **portfolio-ready, end-to-end AI system** and is being built backend-first, with a web UI added later.

---

## 🚀 Features (Current)

* Upload an audio recording (WAV recommended, MP3/M4A supported with ffmpeg)
* Automatic audio preprocessing (mono, resampling)
* Pitch tracking (works for **singing and guitar**)
* Tempo & onset detection (timing analysis)
* Vocal stability analysis for sustained notes
* Numeric practice scores:

  * Pitch Accuracy
  * Timing Consistency
  * Vocal Stability
* Automatically generated visualizations:

  * Pitch-over-time plot
  * Onset timing plot
* Session-based results saved to disk
* Interactive API documentation via Swagger UI

---

## 🧠 How It Works

1. User uploads an audio file
2. Backend processes the audio:

   * Pitch extraction
   * Onset & tempo detection
   * Stability analysis
3. Metrics are scored using explainable heuristics
4. Feedback is generated in plain English
5. Results (JSON + plots) are saved per session

Each analysis run creates a reproducible session folder containing all outputs.

---

## 🛠 Tech Stack

### Backend

* **Python 3**
* **FastAPI** – API framework
* **librosa** – audio feature extraction
* **NumPy / SciPy** – signal processing
* **matplotlib** – visualization
* **ffmpeg** – audio format conversion
* **Pydantic** – data validation

### Frontend (Planned)

* React (Vite)
* Tailwind CSS
* shadcn/ui

---

## 📁 Project Structure

```
music-practice-ai/
  api/
    app/
      main.py
      routes/
      services/
      core/
      models/
      outputs/
        sessions/
```

Generated session outputs are stored under:

```
api/app/outputs/sessions/<session_id>/
```

---

## ▶️ Running Locally

### 1. Install system dependency (recommended)

macOS:

```bash
brew install ffmpeg
```

### 2. Create virtual environment & install dependencies

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Start the API server

```bash
uvicorn app.main:app --reload
```

### 4. Open API Docs

Navigate to:

```
http://127.0.0.1:8000/docs
```

Use the `/api/analyze` endpoint to upload an audio file and view results.

---

## 📊 Example Output

Each session returns:

* `result.json` – scores, metadata, and feedback
* `pitch.png` – pitch-over-time visualization
* `onsets.png` – timing/onset visualization

Example feedback:

* "Pitch is generally stable but drifts during sustained notes."
* "Timing inconsistency detected — try practicing with a metronome."

---

## 🧩 Design Philosophy

* **Explainable AI first** – simple, interpretable metrics
* **Clean separation of concerns** (API / services / core logic)
* **Session-based outputs** for reproducibility and debugging
* **Expandable architecture** for ML models and UI integration

---

## 🔮 Planned Improvements

* Web UI for uploading audio and browsing sessions
* Real-time recording in browser
* ML-based scoring models
* Personalized practice recommendations
* User accounts & progress tracking
* Support for reference tracks / backing tracks

---

## 👤 Author

**John Lizama**
Computer Science (AI/ML)
George Mason University

---

## 📄 License

This project is for educational and portfolio purposes.





music-practice-ai/
  README.md
  .gitignore

  api/
    requirements.txt
    app/
      main.py

      api/                     # FastAPI routes only (thin)
        routes/
          analyze.py
          sessions.py

      domain/                  # business logic (no FastAPI, no filesystem)
        analysis/
          service.py           # analyze_take() orchestration
          scoring.py           # pitch/rhythm scoring
          feedback.py          # convert scores -> coaching tips
        sessions/
          service.py           # start/end session, attach take

      audio/                   # signal processing + utilities
        io.py                  # load/convert/normalize audio
        features.py            # pitch/onsets/mfcc extraction

      data/                    # persistence + abstractions
        storage/
          audio_store.py       # local now, S3 later
          paths.py             # session/take paths
        repositories/
          session_repo.py      # in-memory now, Postgres later

      models/                  # Pydantic DTOs (API contracts)
        schemas.py

      common/
        config.py
        logging.py
        errors.py

  runtime/                     # generated (gitignored)
    sessions/
    tmp/

  web/                         # later
