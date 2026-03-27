# 04 — Class Diagram

## Overview

This document shows two separate class diagrams:

1. **ORM Models** — SQLAlchemy classes that map to database tables (`models/__init__.py`)
2. **Pydantic Schemas** — Request/response contracts used at the API boundary (`schemas/schemas.py`)

They are kept separate because they serve different purposes. Models represent the database shape. Schemas represent what the API accepts and returns — they are not always the same thing.

---

## ORM Models (Current)

These are the SQLAlchemy classes that exist in the codebase today.

```mermaid
classDiagram

    class Users {
        +int id
        +str email
        +str password
        +datetime created_at
    }

    class Sessions {
        +int id
        +str title
        +str content
        +datetime created_at
        +int owner_id
        +Users owner
    }

    class Votes {
        +int user_id
        +int session_id
    }

    Users "1" --> "0..*" Sessions : owns
    Users "1" --> "0..*" Votes   : casts
    Sessions "1" --> "0..*" Votes : receives
```

---

## Pydantic Schemas (Current)

These are the request/response validation schemas used by the API routes today.

```mermaid
classDiagram

    class UserBase {
        +EmailStr email
        +str password
    }
    class UserOut {
        +int id
        +str email
        +from_attributes: true
    }
    class UserLogin {
        +EmailStr email
        +str password
    }

    class PostCreate {
        +str title
        +str content
    }
    class PostOut {
        +str title
        +str content
        +int owner_id
    }
    class PostCreateOut {
        +str title
        +str content
        +datetime created_at
        +int id
        +int owner_id
        +UserOut owner
        +from_attributes: true
    }
    class SessionListOut {
        +PostCreateOut session
        +int likes
    }

    class Token {
        +str token
        +str token_type
    }
    class TokenData {
        +Optional~int~ id
    }

    class Vote {
        +int session_id
        +Literal~0,1~ dir
    }

    UserBase <|-- UserLogin        : extends
    PostOut  <|-- PostCreateOut    : extends
    PostCreateOut --> UserOut      : embeds owner
    SessionListOut --> PostCreateOut : wraps session
    Token --> TokenData            : token encodes
```

---

## Planned ORM Models

These models represent the full planned schema. They are documented here for design purposes and will be implemented via Alembic migrations.

```mermaid
classDiagram

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
    }

    class SocialPosts {
        +int id
        +int take_id
        +int user_id
        +str caption
        +bool is_public
        +datetime created_at
    }

    class Votes {
        +int user_id
        +int post_id
    }

    class Comments {
        +int id
        +int post_id
        +int user_id
        +str content
        +datetime created_at
    }

    class Follows {
        +int follower_id
        +int following_id
    }

    class InstrumentType {
        <<enumeration>>
        vocal
        guitar
        both
    }

    class TakeStatus {
        <<enumeration>>
        pending
        processing
        complete
        failed
    }

    Users "1" --> "0..*" PracticeSessions  : owns
    Users "1" --> "0..*" SocialPosts       : authors
    Users "1" --> "0..*" Votes             : casts
    Users "1" --> "0..*" Comments          : writes
    Users "1" --> "0..*" Follows           : follower
    Users "1" --> "0..*" Follows           : following

    PracticeSessions "1" --> "0..*" PracticeTakes   : contains
    PracticeTakes    "1" --> "0..1" AnalysisResults  : has result
    PracticeTakes    "1" --> "0..1" SocialPosts      : shared as

    SocialPosts "1" --> "0..*" Votes     : receives
    SocialPosts "1" --> "0..*" Comments  : receives

    PracticeSessions --> InstrumentType  : uses
    PracticeTakes    --> TakeStatus      : uses
```

---

## Planned Pydantic Schemas

```mermaid
classDiagram

    class UserCreate {
        +EmailStr email
        +str password
        +str username
    }
    class UserOut {
        +int id
        +str email
        +str username
        +str bio
        +str profile_pic_url
        +bool is_private
        +datetime created_at
    }
    class UserProfile {
        +int id
        +str username
        +str profile_pic_url
    }

    class PracticeSessionCreate {
        +str title
        +str description
        +InstrumentType instrument_type
    }
    class PracticeSessionOut {
        +int id
        +str title
        +str description
        +InstrumentType instrument_type
        +datetime created_at
    }
    class PracticeSessionDetail {
        +List~PracticeTakeOut~ takes
    }

    class PracticeTakeOut {
        +int id
        +int take_number
        +float duration_seconds
        +str file_format
        +TakeStatus status
        +datetime created_at
    }
    class PracticeTakeDetail {
        +AnalysisResultOut analysis
    }

    class ScoresOut {
        +float pitch_accuracy
        +float timing
        +float stability
        +float overall
    }
    class FeedbackOut {
        +str overall
        +str pitch
        +str timing
        +str stability
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
    }

    class SocialPostCreate {
        +int take_id
        +str caption
    }
    class SocialPostOut {
        +int id
        +str caption
        +datetime created_at
        +UserProfile author
        +int likes
        +float overall_score
    }

    class Vote {
        +int post_id
        +Literal~0,1~ dir
    }

    PracticeSessionOut  <|-- PracticeSessionDetail  : extends
    PracticeTakeOut     <|-- PracticeTakeDetail     : extends

    PracticeSessionDetail --> PracticeTakeOut       : contains list
    PracticeTakeDetail    --> AnalysisResultOut     : embeds

    AnalysisResultOut --> ScoresOut                 : embeds scores
    AnalysisResultOut --> FeedbackOut               : embeds feedback
    SocialPostOut     --> UserProfile               : embeds author
```
