# Security Audit & Improvement Report

**Project:** Music Practice Companion (FastAPI + Expo/React Native)
**Date:** 2026-07-01
**Scope:** `api/` backend, `frontend/`, CI/CD workflow, Docker/deploy config

> **UPDATE (same day):** the sprint build-out fixed S2, S3, S4 (endpoint removed, secure `/analyze` added), S5, S6, S7, S8, S9 (SHA-pinned action; compose image pinning still on you), S11, S12, S15, S16, S17 — each with regression tests in `api/tests/test_security.py`. **Still on you:** S1 (rotate the DB password + SECRET_KEY — code can't do that for you; `.dockerignore` is now in place), S10 (TLS in front of the API), S13 (`git rm --cached api/test.db`), S14 (cleanup policy for stored recordings).

---

## 1. Security Findings

### 🔴 CRITICAL

#### S1. Live secrets sitting in `api/.env` (and no `.dockerignore` to keep them out of images)
- **File:** `api/.env`
- Contains your real Postgres password and JWT `SECRET_KEY`. The password looks like a personal/reused password — if you use it anywhere else, rotate it everywhere.
- Verified it is **gitignored and never appeared in git history** (good), but:
- **`api/Dockerfile` does `COPY . .` and there is no `api/.dockerignore`** → building the image bakes `.env`, `test.db`, `.venv`, and user audio uploads into the image. Anyone who pulls `johnlizama/backendapi` from Docker Hub gets your secrets.
- **Fix:**
  1. Add `api/.dockerignore` with at least: `.env`, `.venv`, `test.db`, `uploads/`, `app/outputs/`, `app/core/temp_folder/`, `__pycache__`, `*.ipynb`, `.pytest_cache`
  2. Rotate `SECRET_KEY` (`openssl rand -hex 32`) and the DB password now — assume both are burned if the image was ever pushed.
  3. In production, inject env vars via AWS SSM Parameter Store / Secrets Manager instead of a `.env` file on the EC2 box.

#### S2. `/users` endpoints have no authentication at all (IDOR / full account takeover)
- **File:** `api/app/routes/users.py`
- `GET /users/` (list all users), `GET /users/{id}`, `PUT /users/{id}`, `DELETE /users/{id}` — none require a token. **Anyone on the internet can enumerate every user's email, change any user's email/password, or delete any account.**
- **Fix:** add `current_user = Depends(oauth2.get_current_user)` to get/update/delete, and enforce `current_user.id == id` (or an admin role) before mutating. Only `POST /users/` (registration) should be public.

#### S3. `PUT /sessions/{id}` missing ownership check
- **File:** `api/app/routes/sessions.py` — `update_session`
- `delete_session` correctly checks `deleted_session.owner_id != current_user.id`, but **update does not** — any logged-in user can edit anyone's session.
- **Fix:** copy the same ownership check into `update_session`.

#### S4. Upload endpoint: path traversal + no limits + no auth
- **File:** `api/app/routes/uploads.py`
- `file_path = UPLOAD_DIR / file.filename` uses the **client-controlled filename**. A filename like `../../app/main.py` writes outside the upload dir (arbitrary file overwrite → remote code execution). No auth, no size limit, no content-type/extension validation.
- Currently **not registered** in `main.py` (dormant), but it's a landmine — you'll wire it up when you connect the frontend.
- **Fix:** generate a server-side name (`uuid4().hex + safe_extension`), validate extension/MIME against an allowlist (`.wav`, `.mp3`, `.m4a`), stream to disk in chunks with a max-size cap (e.g. 25 MB), require auth. You already have `create_session_paths()` in `app/storage/sessions.py` that does UUID dirs — use it here.

### 🟠 HIGH

#### S5. CORS: wildcard origin + `allow_credentials=True`
- **File:** `api/app/main.py`
- `origins` contains `"*"` while `allow_credentials=True`. Starlette handles this by reflecting the request Origin, which means **any website can make credentialed requests to your API**. The tutorial leftovers (`localhost.tiangolo.com`, `google.com`) should also go.
- **Fix:** list only your real frontend origins and remove `"*"`. Since the mobile app uses Bearer headers (not cookies), you can likely set `allow_credentials=False`.

#### S6. JWT tokens outlive deleted users; no user existence check
- **File:** `api/app/oauth2.py` — `get_current_user` returns `TokenData` straight from the token without querying the DB. A token for a deleted (or password-changed) user stays valid for the full 200-minute lifetime, and `current_user.id` in routes is only trusted token data.
- **Fix:** in `get_current_user`, fetch the user from the DB and 401 if missing. Consider dropping `ACCESS_TOKEN_EXPIRE_MINUTES` from 200 to ~30–60 and adding refresh tokens.

#### S7. No brute-force protection on `/login`
- **File:** `api/app/routes/auth.py`
- Unlimited password attempts; also a timing side-channel (unknown email skips the hash verify, so responses are measurably faster → email enumeration).
- **Fix:** add rate limiting (`slowapi` is the easy drop-in for FastAPI), and run `utils.verify` against a dummy hash when the user isn't found. Use 401 instead of 403 for bad credentials.

### 🟡 MEDIUM

#### S8. Deploy job runs on every push to every branch
- **File:** `.github/workflows/build-deploy.yml` — `on: [push]` with a `Deploy` job that `git reset --hard origin/main` on prod. Any pushed branch triggers a prod deploy (only gated if you configured a manual approval on the `production` environment).
- **Fix:** `on: push: branches: [main]` for deploy (or split workflows); keep tests on all branches/PRs.

#### S9. Supply-chain hygiene in CI/CD
- `appleboy/ssh-action@v1` is a mutable tag — pin to a commit SHA for a third-party action that receives your prod SSH key.
- `key.pem` is written to the runner workspace; it's ephemeral but pass `key: ${{ secrets... }}` directly to the action instead of writing a file.
- `image: postgres` (unpinned) in `docker-compose-prod.yml` — pin a major version (e.g. `postgres:18`). Note the volume mount `/var/lib/postgresql` is only the correct data path for PG 18+; for ≤17 it must be `/var/lib/postgresql/data` or **your data silently won't persist**.

#### S10. API served over plain HTTP on port 80
- **File:** `api/docker-compose-prod.yml` maps `80:8000` with no TLS. Credentials and JWTs travel in cleartext.
- **Fix:** put Caddy or nginx + Let's Encrypt (or an ALB) in front; redirect 80 → 443.

#### S11. Container runs as root on a bleeding-edge base
- **File:** `api/Dockerfile` — `python:3.14.2` (CI tests on 3.13 — test what you ship), no non-root `USER`, full (not slim) image.
- **Fix:** `FROM python:3.13-slim`, create an app user, `USER appuser`.

#### S12. Auth library choices
- `python-jose` 3.5.0 has patched its 2024 CVEs, but it pulls in `ecdsa` (known Minerva timing CVE-2024-23342, won't be fixed) and is barely maintained. You already have **PyJWT** in requirements — migrate to it and drop `python-jose`.
- `passlib` is unmaintained (last release 2020); you already have `pwdlib` + `argon2-cffi` installed — switch `utils.py` to `pwdlib` with Argon2, keeping `pbkdf2_sha256` listed as deprecated so old hashes still verify.

### 🟢 LOW

- **S13.** `api/test.db` (15 MB SQLite) is committed to the public repo. Currently no user rows, but remove it and add `*.db` to `.gitignore`.
- **S14.** Real vocal recordings of people sit in `api/uploads/`, `api/app/outputs/`, `api/app/core/temp_folder/`. They're gitignored, but they're personal data — keep them out of Docker images (S1 fix) and consider a cleanup policy.
- **S15.** Error responses leak existence info ("User with ID: 4 does not exist") and misuse 403 where 404/401 fit. Minor, but tidy up.
- **S16.** `get_all_sessions(limit=10, skip=0)` — untyped query params; `?limit=abc` produces a raw 500. Type them (`limit: int = Query(10, le=100)`).
- **S17.** `requirements.txt` includes `typing==3.7.4.3` (obsolete stdlib backport) — remove. Add `pip-audit` or Dependabot to CI to catch vulnerable pins automatically.

**Checked and clean:** SQL injection (all queries go through the SQLAlchemy ORM with bound parameters), password storage (hashed, never returned — `UserOut` excludes it), `.env` never committed to git history, Postgres not exposed publicly in compose.

---

## 2. Product / Code Improvements

### The big one: connect the two halves
- `frontend/src/api.ts` is **100% mock** — every screen runs on `mockData.ts`, and `login()` accepts any non-empty credentials. Meanwhile the backend's real analysis pipeline (`app/core/features.py`, `scoring.py`, `feedback.py`, librosa notebook work) is never exposed: `services/analysis_service.py` and `core/audio_io.py` are **empty files**, and the uploads router is never included in `main.py`.
- Suggested order: (1) implement `audio_io.py` + `analysis_service.py` wrapping your notebook code, (2) mount a secured upload → analyze → results flow (`POST /uploads` → `GET /sessions/{id}/analysis`), (3) swap `api.ts` bodies for real `fetch` calls (the file is already structured for this — nice design), (4) store the JWT with `expo-secure-store`, not in memory.

### Backend
- **Duplicate function names:** every handler in `users.py` is named `create_users` — rename (`get_user`, `update_user`, `delete_user`); helps tracebacks and OpenAPI docs.
- **`database/session.py` cleanup:** `Base` is defined twice (`declarative_base()` then overwritten by a `DeclarativeBase` subclass) and an unused SQLite `DATABASE_URL` sits alongside the Postgres URL. Keep one `Base`, delete dead config.
- **Schema drift:** `PostBase` in `schemas.py` uses `UUID` ids while models use `Integer`; `SessionCreate`/`SessionUpdate` don't match any model. Prune or align.
- **Auth route gap:** registration lives at `POST /users/` while login is `/login` — your own commented-out plan (`/auth/register`, `/auth/me`, `/logout`) is the right shape; implement `GET /users/me` before generic `GET /users/{id}`.
- **Votes route** returns ad-hoc dicts — add a `response_model` for consistency.
- **API versioning:** prefix routers with `/api/v1` now, before a mobile release makes breaking changes painful.
- **Dead/temp files in repo:** `tempCodeRunnerFile.ipynb`, empty `database/base.py`, `.DS_Store` files, `activate.sh`. Add `.DS_Store` to `.gitignore` and delete the rest.

### Testing & CI
- Tests exist and use fixtures well, but there's **zero coverage of the untested attack surface** — add tests asserting 401s on `/users/{id}` mutations and the `PUT /sessions/{id}` ownership check once fixed (they'd have caught S2/S3).
- CI: add `ruff` (lint) and `pip-audit` steps; cache is already set up. Consider `pytest --cov` with a threshold.
- Pin CI Python (3.13) to match the Docker base once you fix S11.

### Frontend
- Playwright config exists — add a CI job for it (`npx playwright test` against `expo start --web`).
- When wiring real auth: central fetch wrapper that attaches the token and handles 401 → redirect to login, so screens stay unchanged.

---

## 3. Priority Checklist

| # | Action | Effort |
|---|--------|--------|
| 1 | Rotate DB password + `SECRET_KEY`; add `api/.dockerignore` | 15 min |
| 2 | Add auth + ownership checks to `/users` routes (S2) | 1 hr |
| 3 | Ownership check on `PUT /sessions/{id}` (S3) | 10 min |
| 4 | Fix CORS list (S5) | 10 min |
| 5 | Harden upload endpoint before mounting it (S4) | 1–2 hr |
| 6 | DB lookup in `get_current_user` (S6) | 30 min |
| 7 | Deploy only on `main`; pin ssh-action + postgres image (S8/S9) | 30 min |
| 8 | TLS in front of the API (S10) | 1–2 hr |
| 9 | Rate-limit `/login` (S7) | 1 hr |
| 10 | Wire real upload → analysis → frontend flow | the real work 🙂 |
