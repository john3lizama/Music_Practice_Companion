"""Sprint 1 — POST /analyze.

Security posture:
- auth required (analysis costs CPU; anonymous uploads invite abuse)
- extension + content-type allowlist, real validation happens on decode
- size cap enforced while streaming to disk (a spoofed Content-Length can't bypass it)
- files stored under server-generated UUID names — the client filename is
  never used to build a path (prevents path traversal)
"""
import logging
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from .. import models, oauth2
from ..config import settings
from ..schemas.analysis import AnalyzeMetadata, AnalyzeResponse
from ..services import analysis_service

logger = logging.getLogger("analyze")

router = APIRouter(tags=["Analysis"])

ALLOWED_EXTENSIONS = {".wav", ".mp3"}
ALLOWED_CONTENT_TYPES = {
    "audio/wav", "audio/x-wav", "audio/wave",
    "audio/mpeg", "audio/mp3",
    "application/octet-stream",  # common for mobile clients; decode still validates
}
CHUNK_SIZE = 1024 * 1024  # 1 MB


def sessions_base_dir() -> Path:
    return Path(settings.SESSIONS_DIR)


async def _save_upload_checked(file: UploadFile, dest_dir: Path) -> Path:
    """Validate and stream an upload to disk under a server-generated name."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix or 'unknown'}'. Allowed: .wav, .mp3",
        )
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type '{file.content_type}'",
        )

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    dest = dest_dir / f"{uuid.uuid4().hex}{suffix}"  # never the client's filename
    written = 0
    with open(dest, "wb") as out:
        while chunk := await file.read(CHUNK_SIZE):
            written += len(chunk)
            if written > max_bytes:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit",
                )
            out.write(chunk)
    if written == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )
    return dest


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    file: UploadFile = File(...),
    instrument: str = Form("Other"),
    bpm_target: int | None = Form(None),
    exercise_name: str | None = Form(None),
    reference: UploadFile | None = File(None),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    """Upload a recording (optionally with a reference recording) and get
    back scores, coaching feedback, and a session_id to retrieve it later."""
    try:
        metadata = AnalyzeMetadata(
            instrument=instrument, bpm_target=bpm_target, exercise_name=exercise_name
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        upload_path = await _save_upload_checked(file, tmp_dir)
        reference_path = None
        if reference is not None and reference.filename:
            reference_path = await _save_upload_checked(reference, tmp_dir)

        try:
            session_data = analysis_service.run_analysis(
                upload_path=upload_path,
                metadata=metadata,
                owner_id=current_user.id,
                base_dir=sessions_base_dir(),
                reference_path=reference_path,
            )
        except analysis_service.AnalysisError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except Exception:
            logger.exception("analysis pipeline failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Analysis failed unexpectedly",
            )

    return session_data
