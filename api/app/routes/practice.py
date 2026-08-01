"""Sprint 1 — /practice/sessions: retrieve analysis history.

Every route requires auth and only ever returns/deletes the caller's own
sessions (ownership is stored in each session.json).
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status

from .. import models, oauth2
from ..schemas.analysis import AnalyzeResponse, SessionSummary
from ..storage import sessions as storage
from .analyze import sessions_base_dir

router = APIRouter(prefix="/practice/sessions", tags=["Practice Sessions"])


def _get_owned_session(session_id: str, user_id: int) -> dict:
    try:
        data = storage.load_session(sessions_base_dir(), session_id)
    except storage.InvalidSessionId:
        # Malformed id (e.g. traversal attempt) — same response as missing.
        raise HTTPException(status_code=404, detail="Session not found")
    # 404 for both "doesn't exist" and "not yours": don't leak which
    # session ids exist to other users.
    if data is None or data.get("owner_id") != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return data


@router.get("/", response_model=List[SessionSummary])
async def list_practice_sessions(
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    """The caller's analysis sessions, most recent first."""
    sessions = storage.list_sessions(sessions_base_dir(), owner_id=current_user.id)
    return [
        SessionSummary(
            session_id=s["session_id"],
            created_at=s["created_at"],
            instrument=s.get("instrument", "Other"),
            exercise_name=s.get("exercise_name"),
            duration_sec=s.get("duration_sec", 0.0),
            overall_score=s.get("scores", {}).get("overall", 0.0),
        )
        for s in sessions
    ]


@router.get("/{session_id}", response_model=AnalyzeResponse)
async def get_practice_session(
    session_id: str,
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    return _get_owned_session(session_id, current_user.id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_practice_session(
    session_id: str,
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    _get_owned_session(session_id, current_user.id)  # 404 if missing or not owner
    storage.delete_session(sessions_base_dir(), session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
