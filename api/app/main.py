from fastapi import FastAPI, HTTPException
from app.routes.analyze import router as analyze_router
from app.routes.sessions import router as sessions_router


from app.schemas.session import SessionCreate, SessionUpdate, PostCreate
# Importing FastAPI and routers for different API endpoints


# creating FastAPI instance
app = FastAPI(title="Music Practice Companion API")

session_id = 0
sessions = {}

# Include routers for different API endpoints
# This modular approach helps in organizing the codebase
# Each router handles a specific set of related endpoints
# For example, analyze_router handles audio analysis endpoints
# and sessions_router manages session-related endpoints
# The routers are defined in separate modules for better maintainability
# This also allows for easier testing and scaling of the application
# The main application file remains clean and focused on configuration
# Additional middleware and configurations can be added here as needed



# Post / Create endpoints for audio analysis
@app.post("/analyze/audio")
async def analyze_audio():
    return await analyze_router.analyze_audio()

@app.post("/analyze/audio/upload")
async def analyze_audio_upload(file: bytes):
    return await analyze_router.analyze_audio_endpoint(file)

# Creating a new post
@app.post("/sessions")
async def create_session(post: PostCreate) -> PostCreate:
    new_post = {"title": post.title, "content": post.content}
    return new_post 

################################################################

# Get / Read endpoints for session management
@app.get("/sessions/{session_id}")
async def get_session(session_id: int) -> PostCreate:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return await sessions_router.get_session(session_id)

################################################################

# Put / Update endpoints for session updates

# Getting target session ID from path
@app.put("/sessions/{session_id}")
async def update_session(session_id: int):
    return await sessions_router.update_session(session_id)

# Getting all the sessions 
@app.get("/sessions")
def get_all_sessions():
    return sessions

################################################################


# Delete endpoints for session removal
@app.delete("/sessions/{session_id}")
async def delete_session(session_id: int):
    return await sessions_router.delete_session(session_id)

