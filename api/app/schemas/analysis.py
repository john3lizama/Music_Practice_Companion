"""Sprint 1 — request/response schemas for the analysis pipeline."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

Instrument = Literal["Vocals", "Guitar", "Bass", "Piano", "Drums", "Other"]


class AnalyzeMetadata(BaseModel):
    """Optional metadata sent alongside the audio upload (as form fields)."""

    instrument: Instrument = "Other"
    bpm_target: Optional[int] = Field(default=None, ge=20, le=400)
    exercise_name: Optional[str] = Field(default=None, max_length=120)


class Scores(BaseModel):
    timing_consistency: Optional[float]
    tempo_stability: Optional[float]
    pitch_stability: Optional[float]
    dynamics_control: Optional[float]
    overall: float
    metrics: dict
    flags: list[str]


class FeedbackItemOut(BaseModel):
    category: str
    severity: str
    message: str
    drill: Optional[str] = None


class ReferenceComparison(BaseModel):
    reference_match_score: Optional[float]
    components: dict
    mismatch_highlights: list[str]


class AnalyzeResponse(BaseModel):
    session_id: str
    owner_id: int
    created_at: str
    instrument: str
    exercise_name: Optional[str]
    bpm_target: Optional[int]
    duration_sec: float
    scores: Scores
    feedback_items: list[FeedbackItemOut]
    top_3_focus: list[str]
    warnings: list[str]
    plots: list[str]
    reference: Optional[ReferenceComparison] = None


class SessionSummary(BaseModel):
    """Compact listing for GET /practice/sessions."""

    session_id: str
    created_at: str
    instrument: str
    exercise_name: Optional[str]
    duration_sec: float
    overall_score: float
