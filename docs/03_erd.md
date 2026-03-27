# 03 — Entity Relationship Diagram (ERD)

## Current Database Schema

This diagram reflects the database as it exists today. Tables and columns map directly to the SQLAlchemy models in `api/app/models/__init__.py`.

```mermaid
erDiagram

    Users {
        int     id          PK
        string  email       "unique, not null"
        string  password    "bcrypt hashed"
        timestamp created_at "server default now()"
    }

    Sessions {
        int     id          PK
        string  title       "not null"
        string  content     "not null"
        int     owner_id    FK
        timestamp created_at "server default now()"
    }

    Votes {
        int     user_id     FK  "composite PK"
        int     session_id  FK  "composite PK"
    }

    Users       ||--o{   Sessions    : "owns (owner_id)"
    Users       ||--o{   Votes       : "casts (user_id)"
    Sessions    ||--o{   Votes       : "receives (session_id)"
```

---

## Relationship Notes

**Users → Sessions** — One user can own many sessions. If a user is deleted, their sessions are cascade-deleted (`ondelete="CASCADE"`).

**Users → Votes** — One user can vote on many sessions. Cascade-deleted with the user.

**Sessions → Votes** — One session can receive many votes. Votes are cascade-deleted when a session is deleted.

**Votes composite PK** — The combination of `(user_id, session_id)` is the primary key, which enforces that a user can only vote once per session at the database level.

---

## Planned Schema Additions

The following tables are designed and documented but not yet implemented. See `06_data_pipeline.md` for the full design rationale.

```mermaid
erDiagram

    Users {
        int     id              PK
        string  email
        string  password
        string  username        "unique"
        string  bio
        string  profile_pic_url
        bool    is_private
        timestamp created_at
        timestamp updated_at
    }

    PracticeSessions {
        int     id              PK
        int     user_id         FK
        string  title
        string  description
        string  instrument_type "vocal | guitar | both"
        timestamp created_at
        timestamp updated_at
    }

    PracticeTakes {
        int     id              PK
        int     session_id      FK
        int     take_number
        string  audio_file_path
        float   duration_seconds
        string  file_format     "wav | mp3 | m4a"
        string  status          "pending | processing | complete | failed"
        timestamp created_at
    }

    AnalysisResults {
        int     id                      PK
        int     take_id                 FK  "unique — one result per take"
        float   pitch_accuracy_score    "0–100"
        float   timing_score            "0–100"
        float   stability_score         "0–100"
        float   overall_score           "0–100 weighted avg"
        float   tempo_bpm
        string  key_detected            "e.g. A minor"
        text    feedback                "JSON — coaching text per metric"
        string  pitch_plot_path
        string  onset_plot_path
        timestamp processed_at
    }

    SocialPosts {
        int     id          PK
        int     take_id     FK  "unique — one post per take"
        int     user_id     FK
        string  caption
        bool    is_public
        timestamp created_at
    }

    Votes {
        int     user_id     FK  "composite PK"
        int     post_id     FK  "composite PK — references SocialPosts"
    }

    Comments {
        int     id          PK
        int     post_id     FK
        int     user_id     FK
        text    content
        timestamp created_at
    }

    Follows {
        int     follower_id     FK  "composite PK"
        int     following_id    FK  "composite PK"
    }

    Users           ||--o{   PracticeSessions    : "owns"
    PracticeSessions||--o{   PracticeTakes       : "contains"
    PracticeTakes   ||--||   AnalysisResults     : "has one result"
    PracticeTakes   ||--o|   SocialPosts         : "optionally shared as"
    Users           ||--o{   SocialPosts         : "authors"
    Users           ||--o{   Votes               : "casts"
    SocialPosts     ||--o{   Votes               : "receives"
    Users           ||--o{   Comments            : "writes"
    SocialPosts     ||--o{   Comments            : "receives"
    Users           ||--o{   Follows             : "follows (follower_id)"
    Users           ||--o{   Follows             : "followed by (following_id)"
```

---

## Key Design Decisions

**PracticeTakes are the central unit** — A take is a single recording attempt. Everything flows from it: the analysis result hangs off it one-to-one, and a social post references it when the user chooses to share.

**SocialPosts are decoupled from PracticeSessions** — This means the social layer doesn't need to know anything about the private practice structure. A user can share a take without exposing any other information about their session.

**Votes migrate from Sessions to SocialPosts** — In the current schema, votes reference sessions. In the planned schema, votes reference social posts. This is the primary migration needed when the social layer is built.

**AnalysisResults uses a unique FK on take_id** — Enforces at the database level that one take can only ever have one analysis result, preventing duplicate processing.
