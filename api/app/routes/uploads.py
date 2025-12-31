from fastapi import APIRouter, File, UploadFile
from pathlib import Path

router = APIRouter()

# Define the directory to save uploaded files, create if it doesn't exist
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload")
# we are assigning our parameter into a UploadFile object
async def upload_audio(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename

#audio files require raw bytes 
#read->write->save to disk (file system)

    with open(file_path, "wb") as f:
        f.write(await file.read())
    print(f"Saved file to {file_path}")
    
    return {
        "filename": file.filename,
        "content_type": file.content_type
    }
