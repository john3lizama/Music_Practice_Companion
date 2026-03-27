# 05 — Sequence Diagrams

## Overview

Each diagram shows how a specific request flows through the system from the client to the database and back. Actors are labeled by their layer to reinforce the architecture.

---

## 1. User Registration

```mermaid
sequenceDiagram
    actor Client
    participant Route as routes/users.py
    participant Utils as utils.py
    participant DB as PostgreSQL

    Client->>Route: POST /users\n{ email, password }
    Route->>Utils: hash_password(password)
    Utils-->>Route: hashed_password
    Route->>DB: INSERT into users\n(email, hashed_password)
    DB-->>Route: Users record
    Route-->>Client: 201 Created\n{ id, email, created_at }
```

---

## 2. User Login — JWT Authentication

```mermaid
sequenceDiagram
    actor Client
    participant Route as routes/auth.py
    participant DB as PostgreSQL
    participant Utils as utils.py
    participant OAuth as oauth2.py

    Client->>Route: POST /login\n{ username (email), password }
    Route->>DB: SELECT user WHERE email = username
    DB-->>Route: Users record (or None)

    alt User not found
        Route-->>Client: 403 Forbidden\n"Invalid Credentials"
    end

    Route->>Utils: verify(password, user.password)
    Utils-->>Route: True / False

    alt Password incorrect
        Route-->>Client: 403 Forbidden\n"Invalid Credentials"
    end

    Route->>OAuth: create_access_token({ user_id })
    OAuth-->>Route: signed JWT string

    Route-->>Client: 200 OK\n{ token, token_type: "Bearer" }
```

---

## 3. Authenticated Request — Token Verification

This flow is used by every protected route (sessions, votes, etc.) before any business logic runs.

```mermaid
sequenceDiagram
    actor Client
    participant Route as Any Protected Route
    participant OAuth as oauth2.py
    participant DB as PostgreSQL

    Client->>Route: Request with\nAuthorization: Bearer <token>
    Route->>OAuth: get_current_user(token)
    OAuth->>OAuth: verify_access_token(token)

    alt Token invalid or expired
        OAuth-->>Client: 401 Unauthorized\n"Could not validate credentials"
    end

    OAuth-->>Route: TokenData { id }
    Note over Route: Proceeds with current_user.id
```

---

## 4. Create a Practice Session

```mermaid
sequenceDiagram
    actor Client
    participant Route as routes/sessions.py
    participant OAuth as oauth2.py
    participant DB as PostgreSQL

    Client->>Route: POST /sessions\n{ title, content }\nBearer <token>
    Route->>OAuth: get_current_user(token)
    OAuth-->>Route: current_user.id

    Route->>DB: INSERT into sessions\n(title, content, owner_id)
    DB-->>Route: Sessions record

    Route-->>Client: 201 Created\n{ title, content, owner_id }
```

---

## 5. Get All Sessions (with Like Counts)

```mermaid
sequenceDiagram
    actor Client
    participant Route as routes/sessions.py
    participant OAuth as oauth2.py
    participant DB as PostgreSQL

    Client->>Route: GET /sessions?limit=10&skip=0\nBearer <token>
    Route->>OAuth: get_current_user(token)
    OAuth-->>Route: current_user.id

    Route->>DB: SELECT sessions + COUNT(votes)\nJOIN votes ON votes.session_id = sessions.id\nGROUP BY sessions.id\nLIMIT 10 OFFSET 0
    DB-->>Route: List of (session, like_count)

    Route-->>Client: 200 OK\n[{ session: {...}, likes: N }, ...]
```

---

## 6. Vote on a Session (Like / Unlike)

```mermaid
sequenceDiagram
    actor Client
    participant Route as routes/votes.py
    participant OAuth as oauth2.py
    participant DB as PostgreSQL

    Client->>Route: POST /votes\n{ session_id, dir: 1 or 0 }\nBearer <token>
    Route->>OAuth: get_current_user(token)
    OAuth-->>Route: current_user.id

    Route->>DB: SELECT session WHERE id = session_id
    DB-->>Route: session (or None)

    alt Session not found
        Route-->>Client: 404 Not Found
    end

    Route->>DB: SELECT vote WHERE\nsession_id AND user_id

    alt dir == 1 (like)
        alt Vote already exists
            Route-->>Client: 409 Conflict\n"Already voted"
        end
        Route->>DB: INSERT into votes\n(session_id, user_id)
        Route-->>Client: 200 OK\n"successfully added vote"
    else dir == 0 (unlike)
        alt Vote does not exist
            Route-->>Client: 404 Not Found\n"Vote does not exist"
        end
        Route->>DB: DELETE from votes\nWHERE session_id AND user_id
        Route-->>Client: 200 OK\n"successfully deleted vote"
    end
```

---

## 7. Audio Upload + Analysis (Planned)

This flow does not exist yet. It represents the intended behavior once the audio pipeline is implemented. See `06_data_pipeline.md` for the internal design of the analysis step.

```mermaid
sequenceDiagram
    actor Client
    participant Route as routes/uploads.py
    participant Service as analysis_service.py
    participant Core as core/
    participant DB as PostgreSQL
    participant FS as File Storage

    Client->>Route: POST /practice/sessions/{id}/takes\nmultipart/form-data audio file\nBearer <token>

    Route->>FS: Save raw audio file
    FS-->>Route: file_path

    Route->>DB: INSERT into practice_takes\n(session_id, audio_file_path, status="pending")
    DB-->>Route: PracticeTake record

    Route->>Service: analyze_take(take_id)
    Service->>DB: UPDATE take SET status = "processing"

    Service->>Core: audio_io.load_audio(file_path)
    Core-->>Service: (y, sr) waveform

    Service->>Core: features.extract_pitch(y, sr)
    Core-->>Service: pitch_hz, pitch_times

    Service->>Core: features.extract_onsets(y, sr)
    Core-->>Service: onset_times

    Service->>Core: features.extract_tempo(y, sr)
    Core-->>Service: tempo_bpm, beat_times

    Service->>Core: scoring.score_pitch(pitch_hz)
    Core-->>Service: pitch_score

    Service->>Core: scoring.score_timing(onsets, tempo)
    Core-->>Service: timing_score

    Service->>Core: scoring.score_stability(pitch_hz)
    Core-->>Service: stability_score

    Service->>Core: feedback.generate_all_feedback(scores)
    Core-->>Service: feedback dict

    Service->>FS: Save pitch plot + onset plot
    FS-->>Service: plot paths

    Service->>DB: INSERT into analysis_results\n(scores, feedback, plot_paths)
    Service->>DB: UPDATE take SET status = "complete"

    Service-->>Route: AnalysisResults record
    Route-->>Client: 200 OK\n{ scores, feedback, plots }
```
