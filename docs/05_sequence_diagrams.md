# 05 — Sequence Diagrams

**Who this is for:** A developer who needs to trace exactly what happens — step by step, file by file — when a specific API request comes in. These diagrams are the reference for debugging unexpected behavior, understanding auth flow, or knowing what database queries are being made and when.

**Where to find the code:** Each participant label maps directly to a file in `api/app/`.

| Diagram participant | File location |
|---|---|
| `routes/auth.py` | `api/app/routes/auth.py` |
| `routes/users.py` | `api/app/routes/users.py` |
| `routes/sessions.py` | `api/app/routes/sessions.py` |
| `routes/votes.py` | `api/app/routes/votes.py` |
| `routes/uploads.py` | `api/app/routes/uploads.py` (planned) |
| `oauth2.py` | `api/app/oauth2.py` |
| `utils.py` | `api/app/utils.py` |
| `analysis_service.py` | `api/app/services/analysis_service.py` (planned) |
| `core/` | `api/app/core/` (planned) |
| `PostgreSQL` | The database, accessed via SQLAlchemy in `database/session.py` |
| `File Storage` | Local `outputs/` directory (planned S3) |

---

## How to Read These Diagrams

- **Arrows going right (→):** A call or request being made.
- **Arrows going left (--→):** A return value or response.
- **`alt` blocks:** Conditional branches — the diagram shows what happens in each case.
- **`Note` boxes:** Explain what is happening at that step and why.
- Participants are labeled by their file name so you can open the file directly while reading.

---

## 1. User Registration

**What it does:** Creates a new user account. The password is hashed before it ever reaches the database. The client never receives the hashed password back.

**Why hashing matters:** If the database is ever compromised, bcrypt-hashed passwords cannot be reversed into the original password. The `hash_password()` function in `utils.py` handles this using passlib's bcrypt implementation.

```mermaid
sequenceDiagram
    actor Client

    participant Route    as routes/users.py
    participant Utils    as utils.py
    participant DB       as PostgreSQL

    Client->>Route: POST /users
    Note right of Client: Body: { email, password }

    Route->>Route: Validate input using UserCreate schema
    Note right of Route: Pydantic rejects invalid emails or missing fields here.
    Note right of Route: No database call yet.

    Route->>Utils: hash_password(plain_password)
    Note right of Utils: bcrypt generates a one-way hash.
    Note right of Utils: The original password is never stored.
    Utils-->>Route: hashed_password

    Route->>DB: INSERT into users (email, hashed_password)
    Note right of DB: created_at is set automatically by the database.
    DB-->>Route: New Users record

    Route-->>Client: 201 Created
    Note left of Route: Response uses UserOut schema.
    Note left of Route: Returns { id, email, created_at }.
    Note left of Route: Password field is NOT included.
```

---

## 2. User Login — JWT Authentication

**What it does:** Verifies the user's email and password, then issues a signed JWT token. All subsequent protected requests must include this token.

**Why JWT?** JSON Web Tokens are stateless — the server does not store session data. The token itself contains the user's ID in its payload, and the signature (using the `SECRET_KEY` from `.env`) proves it hasn't been tampered with. This means the API can scale horizontally without a shared session store.

**Where the token goes:** The client stores this token and includes it in the `Authorization: Bearer <token>` header on every subsequent request. See diagram 3 for how protected routes verify it.

```mermaid
sequenceDiagram
    actor Client

    participant Route   as routes/auth.py
    participant DB      as PostgreSQL
    participant Utils   as utils.py
    participant OAuth   as oauth2.py

    Client->>Route: POST /login
    Note right of Client: Body: { username (email), password }
    Note right of Client: FastAPI's OAuth2PasswordRequestForm expects
    Note right of Client: "username" as the field name even though we use email.

    Route->>DB: SELECT * FROM users WHERE email = username
    Note right of DB: Looking up the account by email.
    DB-->>Route: Users record (or None)

    alt User not found in database
        Route-->>Client: 403 Forbidden
        Note left of Route: "Invalid Credentials"
        Note left of Route: Vague on purpose — don't reveal whether
        Note left of Route: the email exists or the password is wrong.
    end

    Route->>Utils: verify(plain_password, stored_hash)
    Note right of Utils: bcrypt compares the plain password against the stored hash.
    Note right of Utils: Returns True if they match, False otherwise.
    Utils-->>Route: True or False

    alt Password does not match
        Route-->>Client: 403 Forbidden
        Note left of Route: Same "Invalid Credentials" message —
        Note left of Route: same deliberate vagueness.
    end

    Route->>OAuth: create_access_token({ "user_id": user.id })
    Note right of OAuth: Builds a payload dict with the user ID and an expiry timestamp.
    Note right of OAuth: Signs it using SECRET_KEY and ALGORITHM from config.py.
    Note right of OAuth: Default expiry is ACCESS_TOKEN_EXPIRE_MINUTES from .env.
    OAuth-->>Route: Signed JWT string

    Route-->>Client: 200 OK
    Note left of Route: Response: { token: "eyJ...", token_type: "Bearer" }
    Note left of Route: Client must store this and send it with all future requests.
```

---

## 3. Authenticated Request — How Token Verification Works

**What it does:** Every protected route uses `Depends(oauth2.get_current_user)` to verify the incoming token before running any business logic. This diagram shows what happens inside that dependency on every protected request.

**Why this is important:** Understanding this flow is critical because `get_current_user` currently returns a `TokenData` object (just the user ID), not a full `Users` object. This means routes that call `current_user.id` are using the ID from the token — not from a database query. If you need the full user record inside a route, you need to query the database separately using that ID.

```mermaid
sequenceDiagram
    actor Client

    participant Route   as Any Protected Route
    participant OAuth   as oauth2.py
    participant DB      as PostgreSQL

    Client->>Route: Any request with Authorization header
    Note right of Client: Header: "Authorization: Bearer eyJ..."

    Route->>OAuth: Depends(get_current_user) is called automatically by FastAPI
    Note right of OAuth: oauth2_scheme extracts the token string from the header.

    OAuth->>OAuth: verify_access_token(token)
    Note right of OAuth: Uses python-jose to decode the JWT.
    Note right of OAuth: Verifies the signature against SECRET_KEY.
    Note right of OAuth: Checks the expiry timestamp.

    alt Token is invalid, expired, or tampered with
        OAuth-->>Client: 401 Unauthorized
        Note left of OAuth: "Could not validate credentials"
        Note left of OAuth: Header includes WWW-Authenticate: Bearer
        Note left of OAuth: FastAPI short-circuits — the route function never runs.
    end

    OAuth->>OAuth: Extract user_id from payload
    Note right of OAuth: payload.get("user_id") — this is what was encoded at login.

    OAuth-->>Route: TokenData(id=user_id)
    Note right of Route: current_user.id is now available inside the route function.
    Note right of Route: This is NOT a database query — the ID comes from the token itself.

    Route->>DB: (Optional) Query Users WHERE id = current_user.id
    Note right of DB: Only needed if the route requires full user data.
    Note right of DB: Many routes only need the ID (e.g., to set owner_id on a new record).
```

---

## 4. Create a Practice Session

**What it does:** Creates a new session record owned by the authenticated user. The `owner_id` is taken from the JWT token — the client does not send it. This prevents a user from creating sessions on behalf of other users.

```mermaid
sequenceDiagram
    actor Client

    participant Route   as routes/sessions.py
    participant OAuth   as oauth2.py
    participant DB      as PostgreSQL

    Client->>Route: POST /sessions
    Note right of Client: Body: { title, content }
    Note right of Client: Header: Authorization: Bearer <token>

    Route->>OAuth: Depends(get_current_user)
    Note right of OAuth: Token verified. Returns TokenData(id=user_id).
    OAuth-->>Route: current_user.id

    Route->>Route: Build Sessions object
    Note right of Route: models.Sessions(owner_id=current_user.id, **post.dict())
    Note right of Route: owner_id comes from the token, not from the client body.
    Note right of Route: This prevents a client from spoofing ownership.

    Route->>DB: db.add(session) → db.commit() → db.refresh(session)
    Note right of DB: INSERT into sessions (title, content, owner_id).
    Note right of DB: db.refresh() re-fetches the record so created_at and id are populated.
    DB-->>Route: Sessions record with generated id and created_at

    Route-->>Client: 201 Created
    Note left of Route: Serialized using PostOut schema.
    Note left of Route: Returns { title, content, owner_id }.
```

---

## 5. Get All Sessions (with Like Counts)

**What it does:** Returns a paginated list of sessions with their like counts. Uses a SQL JOIN to count votes efficiently — one query instead of N+1 queries.

**Why the JOIN matters:** A naive approach would be to fetch all sessions and then loop over them, counting votes for each one separately. That is an N+1 query problem — 10 sessions means 11 database round trips. The JOIN approach fetches everything in a single query regardless of how many sessions exist.

```mermaid
sequenceDiagram
    actor Client

    participant Route   as routes/sessions.py
    participant OAuth   as oauth2.py
    participant DB      as PostgreSQL

    Client->>Route: GET /sessions?limit=10&skip=0&search=
    Note right of Client: limit, skip, and search are optional query parameters.
    Note right of Client: Default: limit=10, skip=0, search=""

    Route->>OAuth: Depends(get_current_user)
    Note right of OAuth: Route is protected — must be logged in.
    OAuth-->>Route: current_user.id

    Route->>DB: SELECT sessions.*, COUNT(votes.session_id) as likes
    Note right of DB: FROM sessions
    Note right of DB: LEFT JOIN votes ON votes.session_id = sessions.id
    Note right of DB: GROUP BY sessions.id
    Note right of DB: WHERE sessions.title LIKE '%search%'
    Note right of DB: LIMIT limit OFFSET skip
    Note right of DB: LEFT JOIN means sessions with zero votes are still returned.
    DB-->>Route: List of (Sessions record, like_count integer) tuples

    Route->>Route: Transform results
    Note right of Route: [{"session": session, "likes": likes} for (session, likes) in results]
    Note right of Route: Each item matches the SessionListOut schema structure.

    Route-->>Client: 200 OK
    Note left of Route: List of SessionListOut objects.
    Note left of Route: Each object has { session: { title, content, ... }, likes: N }
```

---

## 6. Vote on a Session (Like / Unlike)

**What it does:** Adds or removes a vote (like) on a session. Uses `dir=1` to like and `dir=0` to unlike. The composite primary key on `Votes` enforces one vote per user per session at the database level.

**Why check for existing votes in the application?** Even though the database would reject a duplicate insert (due to the primary key), catching it in the application first allows us to return a meaningful 409 Conflict response instead of an unhandled database error.

```mermaid
sequenceDiagram
    actor Client

    participant Route   as routes/votes.py
    participant OAuth   as oauth2.py
    participant DB      as PostgreSQL

    Client->>Route: POST /votes
    Note right of Client: Body: { session_id: 5, dir: 1 }
    Note right of Client: dir=1 means like. dir=0 means unlike.

    Route->>OAuth: Depends(get_current_user)
    OAuth-->>Route: current_user.id

    Route->>DB: SELECT * FROM sessions WHERE id = session_id
    Note right of DB: Verify the session exists before attempting to vote on it.
    DB-->>Route: Sessions record or None

    alt Session does not exist
        Route-->>Client: 404 Not Found
        Note left of Route: "Could not find post of {session_id}"
    end

    Route->>DB: SELECT * FROM votes WHERE session_id = ? AND user_id = ?
    Note right of DB: Check whether this user has already voted on this session.
    DB-->>Route: Votes record or None

    alt dir == 1 (Like)
        alt Vote already exists
            Route-->>Client: 409 Conflict
            Note left of Route: "User {id} already voted on post {session_id}"
            Note left of Route: Prevent duplicate likes.
        end

        Route->>DB: INSERT INTO votes (session_id, user_id)
        DB-->>Route: Success
        Route-->>Client: 200 OK — "successfully added vote"
    end

    alt dir == 0 (Unlike)
        alt Vote does not exist
            Route-->>Client: 404 Not Found
            Note left of Route: "Vote does not exist"
            Note left of Route: Cannot unlike something not yet liked.
        end

        Route->>DB: DELETE FROM votes WHERE session_id = ? AND user_id = ?
        DB-->>Route: Success
        Route-->>Client: 200 OK — "successfully deleted vote"
    end
```

---

## 7. Audio Upload and Analysis (Planned)

**What it does:** This is the core AI flow of the application. A user uploads an audio file, the system saves it, triggers the analysis pipeline, and returns scores and coaching feedback. This flow does not exist yet — it represents the intended behavior once the audio pipeline (`core/` files and `analysis_service.py`) is implemented.

**Why the status field on `PracticeTakes` matters:** The take is created with `status="pending"` as soon as the file is saved. Before any audio processing begins, it is updated to `"processing"`. When analysis completes, it becomes `"complete"`. If anything fails, it becomes `"failed"`. This means the client can always query the take's status and know exactly where in the pipeline it is — even if the analysis is running asynchronously in the future.

**Where to implement this:** Start with `core/audio_io.py`, then `core/features.py`, then `core/scoring.py`, then `core/feedback.py`, then wire them together in `services/analysis_service.py`. The route in `routes/uploads.py` should be the last piece. See `06_data_pipeline.md` for the full implementation spec.

```mermaid
sequenceDiagram
    actor Client

    participant Route       as routes/uploads.py
    participant OAuth       as oauth2.py
    participant DB          as PostgreSQL
    participant FS          as File Storage
    participant Service     as analysis_service.py
    participant CoreIO      as core/audio_io.py
    participant CoreFeat    as core/features.py
    participant CoreScore   as core/scoring.py
    participant CoreFeed    as core/feedback.py
    participant CorePlots   as core/plots.py

    Client->>Route: POST /practice/sessions/{id}/takes
    Note right of Client: multipart/form-data audio file (WAV, MP3, or M4A)
    Note right of Client: Authorization: Bearer <token>

    Route->>OAuth: Depends(get_current_user)
    OAuth-->>Route: current_user.id

    Route->>DB: SELECT practice_sessions WHERE id = session_id AND user_id = current_user.id
    Note right of DB: Verify session exists and belongs to this user.
    DB-->>Route: PracticeSessions record

    Route->>FS: Save uploaded audio file to outputs/uploads/<take_id>/
    Note right of FS: Store the raw file before any processing.
    Note right of FS: Save as-is — conversion happens inside audio_io.py
    FS-->>Route: file_path string

    Route->>DB: INSERT into practice_takes (session_id, file_path, status="pending")
    DB-->>Route: PracticeTakes record with generated id

    Route->>Service: analyze_take(take_id=take.id, db=db)
    Note right of Service: Service is called synchronously for now.
    Note right of Service: In a future async version, this would enqueue a job
    Note right of Service: and return the take_id immediately for polling.

    Service->>DB: UPDATE practice_takes SET status = "processing" WHERE id = take_id
    Note right of DB: Client can poll this status field to show a loading state.

    Service->>CoreIO: convert_to_wav(file_path) if not already WAV
    Note right of CoreIO: Uses ffmpeg subprocess to convert MP3/M4A to WAV.
    CoreIO-->>Service: wav_path

    Service->>CoreIO: load_audio(wav_path)
    Note right of CoreIO: librosa.load → normalizes to mono, 22050 Hz.
    CoreIO-->>Service: (y, sr) numpy arrays

    Service->>CoreFeat: extract_pitch(y, sr)
    Note right of CoreFeat: pyin algorithm — returns pitch in Hz per frame.
    Note right of CoreFeat: Unvoiced frames (silence) are NaN.
    CoreFeat-->>Service: (pitch_hz[], times[])

    Service->>CoreFeat: extract_onsets(y, sr)
    Note right of CoreFeat: onset_detect — returns timestamps of note starts.
    CoreFeat-->>Service: onset_times[]

    Service->>CoreFeat: extract_tempo(y, sr)
    Note right of CoreFeat: beat_track — returns BPM and beat positions.
    CoreFeat-->>Service: (tempo_bpm, beat_times[])

    Service->>CoreFeat: extract_stability(pitch_hz)
    Note right of CoreFeat: Standard deviation of voiced pitch frames.
    Note right of CoreFeat: Lower = more stable sustained notes.
    CoreFeat-->>Service: stability_std float

    Service->>CoreFeat: detect_key(y, sr)
    Note right of CoreFeat: Chromagram + Krumhansl-Schmuckler key profiles.
    CoreFeat-->>Service: "A minor" or "C major" etc.

    Service->>CoreScore: score_pitch(pitch_hz)
    Note right of CoreScore: Cents deviation from nearest semitone → 0–100.
    CoreScore-->>Service: pitch_score

    Service->>CoreScore: score_timing(onset_times, tempo_bpm)
    Note right of CoreScore: Onset spacing vs beat grid deviation → 0–100.
    CoreScore-->>Service: timing_score

    Service->>CoreScore: score_stability(stability_std)
    Note right of CoreScore: Maps std dev to 0–100 on a linear scale.
    CoreScore-->>Service: stability_score

    Service->>CoreScore: compute_overall(pitch, timing, stability)
    Note right of CoreScore: Weighted average: 50% pitch, 30% timing, 20% stability.
    CoreScore-->>Service: overall_score

    Service->>CoreFeed: generate_all_feedback(scores)
    Note right of CoreFeed: Threshold-based rules produce coaching text per metric.
    Note right of CoreFeed: Returns { overall, pitch, timing, stability } dict.
    CoreFeed-->>Service: feedback dict

    Service->>CorePlots: save_pitch_plot(pitch_hz, times, take_id)
    Note right of CorePlots: matplotlib — saves pitch-over-time PNG.
    CorePlots-->>Service: pitch_plot_path

    Service->>CorePlots: save_onset_plot(onset_times, tempo_bpm, take_id)
    Note right of CorePlots: matplotlib — saves onset timing PNG.
    CorePlots-->>Service: onset_plot_path

    Service->>DB: INSERT into analysis_results (take_id, scores, feedback, plot_paths)
    Service->>DB: UPDATE practice_takes SET status = "complete", duration_seconds = duration
    DB-->>Service: AnalysisResults record

    Service-->>Route: AnalysisResults ORM object

    Route-->>Client: 200 OK
    Note left of Route: Serialized using AnalysisResultOut schema.
    Note left of Route: Returns { scores: { pitch, timing, stability, overall },
    Note left of Route:          feedback: { overall, pitch, timing, stability },
    Note left of Route:          tempo_bpm, key_detected, plot paths }
```
