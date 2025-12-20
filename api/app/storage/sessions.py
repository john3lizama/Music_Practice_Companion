from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4
import os



# Define the base directory for session storage
# This could be configured elsewhere in a real application
# Creates session path, ID and returns reusable session paths

@dataclass(frozen=True)
class SessionPaths:
    session_id: str
    dir: Path
    raw_wav: Path
    meta_json: Path


# Function to create session paths
# Given a base directory, create a new session with unique ID and paths
# Returns a SessionPaths dataclass instance
def create_session_paths(base_dir: Path) -> SessionPaths:
    session_id = str(uuid4())
    session_dir = base_dir / session_id
    raw_wav_path = session_dir / "raw.wav"
    meta_json_path = session_dir / "meta.json"

    # Ensure the session directory exists
    os.makedirs(session_dir, exist_ok=True)

    return SessionPaths(
        session_id=session_id,
        dir=session_dir,
        raw_wav=raw_wav_path,
        meta_json=meta_json_path
    )

# Example usage:
# base_directory = Path("/path/to/sessions")
# session_paths = create_session_paths(base_directory)
# print(session_paths)
