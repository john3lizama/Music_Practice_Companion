"""Sprint 7 — Session storage + artifacts.

Layout:
    {SESSIONS_DIR}/{session_id}/
        audio.wav        (normalized copy of the upload)
        session.json     (metadata + scores + feedback + features)
        plots/*.png

Session IDs are timestamp-prefixed (sortable) + a uuid suffix (unique):
    20260701T183001_3f2a9c1d

Security:
- Session IDs are validated against a strict pattern everywhere they are
  accepted from a client, so `../../etc` can never traverse out of the base dir.
- Every session records `owner_id`; routes must check it before returning data.
"""
from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

SESSION_ID_RE = re.compile(r"^\d{8}T\d{6}_[0-9a-f]{8}$")


class InvalidSessionId(Exception):
    pass


@dataclass(frozen=True)
class SessionPaths:
    session_id: str
    dir: Path
    audio_wav: Path
    session_json: Path
    plots_dir: Path


def new_session_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    return f"{ts}_{uuid4().hex[:8]}"


def _validate(session_id: str) -> str:
    if not SESSION_ID_RE.match(session_id):
        raise InvalidSessionId(f"Invalid session id: {session_id!r}")
    return session_id


def session_paths(base_dir: Path, session_id: str) -> SessionPaths:
    _validate(session_id)
    session_dir = base_dir / session_id
    return SessionPaths(
        session_id=session_id,
        dir=session_dir,
        audio_wav=session_dir / "audio.wav",
        session_json=session_dir / "session.json",
        plots_dir=session_dir / "plots",
    )


def create_session_paths(base_dir: Path) -> SessionPaths:
    paths = session_paths(base_dir, new_session_id())
    paths.dir.mkdir(parents=True, exist_ok=True)
    return paths


def save_session(paths: SessionPaths, data: dict) -> None:
    paths.dir.mkdir(parents=True, exist_ok=True)
    with open(paths.session_json, "w") as f:
        json.dump(data, f, indent=2)


def load_session(base_dir: Path, session_id: str) -> dict | None:
    paths = session_paths(base_dir, session_id)
    if not paths.session_json.exists():
        return None
    with open(paths.session_json) as f:
        return json.load(f)


def list_sessions(base_dir: Path, owner_id: int | None = None) -> list[dict]:
    """Return session JSONs, most recent first (IDs sort chronologically).

    If owner_id is given, only that user's sessions are returned.
    """
    if not base_dir.exists():
        return []
    sessions = []
    for entry in sorted(base_dir.iterdir(), reverse=True):
        if not entry.is_dir() or not SESSION_ID_RE.match(entry.name):
            continue
        json_path = entry / "session.json"
        if not json_path.exists():
            continue
        try:
            with open(json_path) as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        if owner_id is not None and data.get("owner_id") != owner_id:
            continue
        sessions.append(data)
    return sessions


def delete_session(base_dir: Path, session_id: str) -> bool:
    """Delete a session's folder (audio + json + plots). Returns True if it existed."""
    paths = session_paths(base_dir, session_id)
    if not paths.dir.exists():
        return False
    shutil.rmtree(paths.dir)
    return True
