# 04 — Class Diagram

**Who this is for:** A developer who needs to understand the code-level structure of the data layer — how database models are defined, how API schemas are defined, what the difference between them is, and how they relate to each other.

**Where to find the code:**
- ORM Models → `api/app/models/__init__.py`
- Pydantic Schemas → `api/app/schemas/schemas.py`
- Database session → `api/app/database/session.py`

---

## The Critical Distinction: Models vs. Schemas

This is the most common point of confusion for developers new to FastAPI + SQLAlchemy. **They are not the same thing and they should never be merged.**

**ORM Models** (SQLAlchemy) define what the **database** looks like. Each class maps to a PostgreSQL table. Each attribute maps to a column. When you query the database, you get back a model instance. When you insert data, you create a model instance and add it to the session.

**Pydantic Schemas** define what the **API** looks like — what the client can send in a request body and what they receive back in a response. A schema is what FastAPI validates against before any database code runs. A schema is what FastAPI serializes into JSON before sending a response.

**Why keep them separate?** Because the database shape and the API shape are intentionally different in several ways:

- The database stores `password` as a hashed string. The API should **never return it** — `UserOut` doesn't include `password`.
- The database stores `feedback` as a raw JSON text string. The API returns it as a structured `FeedbackOut` object with named fields.
- The database uses integer IDs and foreign key columns. The API often returns nested objects instead (e.g., `PostCreateOut` embeds a full `UserOut` for the owner instead of just `owner_id`).
- Some API schemas represent operations (e.g., `PostCreate` for creating a session) that don't map to any single table — they only contain the fields the client provides.

---

## Current ORM Models

These are the SQLAlchemy classes that exist in `api/app/models/__init__.py` today. Each class inherits from `Base` (defined in `database/session.py`), which registers it with SQLAlchemy so it can be translated into a database table.

```mermaid
classDiagram
    direction TB

    class Base {
        <<SQLAlchemy DeclarativeBase>>
        All models inherit from this.
        Defined in database/session.py
    }

    class Users {
        +int id
        +str email
        +str password
        +datetime created_at
        ---
        owner relationship to Sessions
        Defined in models/__init__.py
    }

    class Sessions {
        +int id
        +str title
        +str content
        +datetime created_at
        +int owner_id
        ---
        owner relationship back to Users
        Defined in models/__init__.py
    }

    class Votes {
        +int user_id
        +int session_id
        ---
        Composite primary key.
        No auto-increment ID.
        Defined in models/__init__.py
    }

    Base <|-- Users     : inherits
    Base <|-- Sessions  : inherits
    Base <|-- Votes     : inherits

    Users "1" --> "0..*" Sessions : "owner_id FK\nondelete CASCADE"
    Users "1" --> "0..*" Votes    : "user_id FK\nondelete CASCADE"
    Sessions "1" --> "0..*" Votes : "session_id FK\nondelete CASCADE"
```

**How relationships work in SQLAlchemy:**
The `owner = relationship("Users")` line on the `Sessions` class tells SQLAlchemy to automatically load the related `Users` record when you access `session.owner`. This is called a lazy-loaded relationship — the JOIN query happens when you access the attribute, not when you query the session. The `PostCreateOut` schema uses this by embedding a full `UserOut` object in the response.

---

## Current Pydantic Schemas

These are the request/response validation schemas in `api/app/schemas/schemas.py`. Each class inherits from Pydantic's `BaseModel`. When `model_config = ConfigDict(from_attributes=True)` is set, Pydantic can convert a SQLAlchemy model instance directly into the schema — this is how route responses work.

```mermaid
classDiagram
    direction TB

    class BaseModel {
        <<Pydantic BaseModel>>
        All schemas inherit from this.
        Handles validation and serialization.
    }

    class UserBase {
        +EmailStr email
        +str password
        Used as base — not returned directly
    }

    class UserOut {
        +int id
        +str email
        +from_attributes: true
        Returned in responses — NO password field
    }

    class UserLogin {
        +EmailStr email
        +str password
        Used only for POST /login body
    }

    class PostCreate {
        +str title
        +str content
        What the client sends to create a session
    }

    class PostOut {
        +str title
        +str content
        +int owner_id
        Minimal session response
    }

    class PostCreateOut {
        +str title
        +str content
        +datetime created_at
        +int id
        +int owner_id
        +UserOut owner
        +from_attributes: true
        Full session response with nested owner
    }

    class SessionListOut {
        +PostCreateOut session
        +int likes
        Wraps a session + its like count for the feed
    }

    class Token {
        +str token
        +str token_type
        Returned by POST /login
    }

    class TokenData {
        +Optional~int~ id
        Decoded from JWT — holds the user ID only
    }

    class Vote {
        +int session_id
        +Literal~0~1~ dir
        dir=1 to like, dir=0 to unlike
    }

    BaseModel <|-- UserBase
    BaseModel <|-- UserOut
    BaseModel <|-- UserLogin
    BaseModel <|-- PostCreate
    BaseModel <|-- PostOut
    BaseModel <|-- PostCreateOut
    BaseModel <|-- SessionListOut
    BaseModel <|-- Token
    BaseModel <|-- TokenData
    BaseModel <|-- Vote

    UserBase <|-- UserLogin        : inherits email + password
    PostOut  <|-- PostCreateOut    : inherits + adds id, created_at, owner
    PostCreateOut --> UserOut      : embeds as nested owner object
    SessionListOut --> PostCreateOut : wraps session + adds likes count
    Token --> TokenData            : token string encodes TokenData fields
```

**How a route uses these schemas:**

```python
# In routes/sessions.py:
@router.post("/", response_model=PostOut)           # ← FastAPI serializes response as PostOut
async def create_session(post: PostCreate, ...):    # ← FastAPI validates input as PostCreate
```

FastAPI uses the `response_model` to filter and serialize the return value. Even if the function returns a full SQLAlchemy `Sessions` object with many fields, FastAPI will only include the fields declared in `PostOut`.

---

## Planned ORM Models

These models represent the full designed schema. They extend the current models with domain-specific fields and add the tables needed for audio analysis and social features. See `03_erd.md` for the database-level design and `06_data_pipeline.md` for the audio pipeline design.

```mermaid
classDiagram
    direction TB

    class Users {
        +int id
        +str email
        +str password
        +str username
        +str bio
        +str profile_pic_url
        +bool is_private
        +datetime created_at
        +datetime updated_at
    }

    class PracticeSessions {
        +int id
        +int user_id
        +str title
        +str description
        +InstrumentType instrument_type
        +datetime created_at
        +datetime updated_at
        ---
        owner: Users
        takes: List~PracticeTakes~
    }

    class PracticeTakes {
        +int id
        +int session_id
        +int take_number
        +str audio_file_path
        +float duration_seconds
        +str file_format
        +TakeStatus status
        +datetime created_at
        ---
        session: PracticeSessions
        analysis: AnalysisResults
        social_post: SocialPosts
    }

    class AnalysisResults {
        +int id
        +int take_id
        +float pitch_accuracy_score
        +float timing_score
        +float stability_score
        +float overall_score
        +float tempo_bpm
        +str key_detected
        +str feedback
        +str pitch_plot_path
        +str onset_plot_path
        +datetime processed_at
        ---
        take: PracticeTakes
    }

    class SocialPosts {
        +int id
        +int take_id
        +int user_id
        +str caption
        +bool is_public
        +datetime created_at
        ---
        take: PracticeTakes
        author: Users
        votes: List~Votes~
        comments: List~Comments~
    }

    class Votes {
        +int user_id
        +int post_id
        Composite PK — no auto ID
    }

    class Comments {
        +int id
        +int post_id
        +int user_id
        +str content
        +datetime created_at
        ---
        post: SocialPosts
        user: Users
    }

    class Follows {
        +int follower_id
        +int following_id
        Composite PK — no auto ID
    }

    class InstrumentType {
        <<Enumeration>>
        vocal
        guitar
        both
    }

    class TakeStatus {
        <<Enumeration>>
        pending
        processing
        complete
        failed
    }

    Users "1" --> "0..*" PracticeSessions   : owns
    Users "1" --> "0..*" SocialPosts        : authors
    Users "1" --> "0..*" Votes              : casts
    Users "1" --> "0..*" Comments           : writes
    Users "1" --> "0..*" Follows            : follower_id
    Users "1" --> "0..*" Follows            : following_id

    PracticeSessions "1" --> "0..*" PracticeTakes   : contains
    PracticeTakes "1" --> "0..1" AnalysisResults    : has one result
    PracticeTakes "1" --> "0..1" SocialPosts        : optionally shared as

    SocialPosts "1" --> "0..*" Votes     : receives
    SocialPosts "1" --> "0..*" Comments  : receives

    PracticeSessions --> InstrumentType : uses enum
    PracticeTakes    --> TakeStatus     : uses enum
```

---

## Planned Pydantic Schemas

These schemas align with the planned models. Notice how the nesting reflects the relationships — a `PracticeSessionDetail` embeds a list of `PracticeTakeOut` objects, and a `PracticeTakeDetail` embeds an `AnalysisResultOut`. This is intentional: the API response mirrors the data relationships without exposing raw foreign key IDs.

```mermaid
classDiagram
    direction TB

    class UserCreate {
        +EmailStr email
        +str password
        +str username
        Input for POST /users
    }

    class UserOut {
        +int id
        +str email
        +str username
        +str bio
        +str profile_pic_url
        +bool is_private
        +datetime created_at
        Full profile — no password
    }

    class UserProfile {
        +int id
        +str username
        +str profile_pic_url
        Minimal — embedded inside posts and comments
    }

    class PracticeSessionCreate {
        +str title
        +str description
        +InstrumentType instrument_type
        Input for POST /practice/sessions
    }

    class PracticeSessionOut {
        +int id
        +str title
        +str description
        +InstrumentType instrument_type
        +datetime created_at
        +datetime updated_at
        Summary — used in list views
    }

    class PracticeSessionDetail {
        +List~PracticeTakeOut~ takes
        Full session — includes all takes
        Used for GET /practice/sessions/id
    }

    class PracticeTakeOut {
        +int id
        +int take_number
        +float duration_seconds
        +str file_format
        +TakeStatus status
        +datetime created_at
        Summary — used inside session detail
    }

    class PracticeTakeDetail {
        +AnalysisResultOut analysis
        Full take — includes analysis result
        Used for GET /practice/sessions/id/takes/id
    }

    class ScoresOut {
        +float pitch_accuracy
        +float timing
        +float stability
        +float overall
        Grouped scores for clarity
    }

    class FeedbackOut {
        +str overall
        +str pitch
        +str timing
        +str stability
        Coaching text per metric
    }

    class AnalysisResultOut {
        +int id
        +int take_id
        +ScoresOut scores
        +float tempo_bpm
        +str key_detected
        +FeedbackOut feedback
        +str pitch_plot_path
        +str onset_plot_path
        +datetime processed_at
        Full analysis result
    }

    class SocialPostCreate {
        +int take_id
        +str caption
        Input for POST /posts — share a take
    }

    class SocialPostOut {
        +int id
        +str caption
        +datetime created_at
        +UserProfile author
        +int likes
        +float overall_score
        Social feed card — embeds author
    }

    class Vote {
        +int post_id
        +Literal~0~1~ dir
        Input for POST /votes
    }

    class CommentCreate {
        +str content
        Input for POST /posts/id/comments
    }

    class CommentOut {
        +int id
        +str content
        +datetime created_at
        +UserProfile author
        Embeds author profile
    }

    PracticeSessionOut  <|-- PracticeSessionDetail  : extends — adds takes list
    PracticeTakeOut     <|-- PracticeTakeDetail     : extends — adds analysis

    PracticeSessionDetail --> PracticeTakeOut    : embeds list of takes
    PracticeTakeDetail    --> AnalysisResultOut  : embeds analysis result
    AnalysisResultOut     --> ScoresOut          : embeds scores
    AnalysisResultOut     --> FeedbackOut        : embeds coaching feedback
    SocialPostOut         --> UserProfile        : embeds minimal author info
    CommentOut            --> UserProfile        : embeds minimal author info
```

**Why `UserProfile` instead of `UserOut` inside posts?**
When the API returns a list of 20 social posts, embedding the full `UserOut` (with bio, privacy settings, created date) for every post author would bloat the response significantly. `UserProfile` is a minimal projection — just enough to render an avatar and a username link in the UI. The full profile is only fetched when navigating to `GET /users/{username}`.

**Why `ScoresOut` and `FeedbackOut` as nested objects inside `AnalysisResultOut`?**
Grouping scores under a `scores` key and feedback under a `feedback` key makes the API response self-documenting and easy to consume in a frontend. Instead of a flat list of `pitch_accuracy_score`, `timing_score`, etc., the client receives a structured object that mirrors how the data is logically organized. This also makes it easy to add new metrics later without breaking existing clients.
