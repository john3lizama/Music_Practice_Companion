from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Form
from app.routes.analyze import router as analyze_router
from app.routes.sessions import router as sessions_router
from app.database.session import Post, get_async_session, create_db_and_tables
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
from sqlalchemy import select


from app.schemas.session import SessionCreate, SessionUpdate, PostCreate
# Importing FastAPI and routers for different API endpoints

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database and tables
    await create_db_and_tables()
    yield
    # Shutdown: Any cleanup can be done here if necessary

# creating FastAPI instance
app = FastAPI(title="Music Practice Companion API", lifespan=lifespan)

# Including routers for different API endpoints
app.include_router(analyze_router)


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
@app.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    caption: str = Form(""),
    #dependency injection for database session
    session: AsyncSession = Depends(get_async_session)
): 
    post = Post(
        title=file.filename,
        notes=caption,
        file_type=file.content_type,
        content=await file.read()
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return {
        "id": post.id,
        "title": post.title,
        "notes": post.notes,
        "file_type": post.file_type,
        "created_at": post.created_at.isoformat()
    }

################################################################

# Get / Read endpoints for session management
@app.get("/feed")
async def get_feed(
    session: AsyncSession = Depends(get_async_session)
):
    # SQL query to get all posts ordered by creation date descending
    result = await session.execute(select(Post).order_by(Post.created_at.desc()))
    posts = [row[0] for row in result.all()]

    posts_data = []
    for post in posts:
        posts_data.append({
            "id": post.id,
            "title": post.title,
            "notes": post.notes,
            "file_type": post.file_type,
            "created_at": post.created_at.isoformat()
        })
    return {"posts": posts_data}


################################################################

# Put / Update endpoints for session updates



################################################################


# Delete endpoints for session removal