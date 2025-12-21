from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import re

router = APIRouter()

UPLOAD_DIR = Path("app/outputs/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def safe_filename(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9._-]", "_", name.strip())
    return name or "audio_upload"

@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Not audio: {file.content_type}")

    data = await file.read()

    out_path = UPLOAD_DIR / safe_filename(file.filename)
    out_path.write_bytes(data)

    # ✅ return only JSON-serializable stuff
    return {
        "message": "uploaded",
        "filename": file.filename,
        "saved_as": str(out_path),
        "content_type": file.content_type,
        "size_bytes": len(data),
    }
