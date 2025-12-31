from fastapi import FastAPI
from sqlalchemy.orm import Session
from app.routes import sessions, users, auth
from . import models
from app.database.session import engine
from .config import settings



models.Base.metadata.create_all(bind=engine)


# creating FastAPI instance
app = FastAPI(title="Music Practice Companion API")


# Including routers for different API endpoints
# including all endpoints included in FastAPI for user authentication and management
#app.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"])
#app.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
#app.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])
#app.include_router(fastapi_users.get_verify_router(UserRead), prefix="/auth", tags=["auth"])
#app.include_router(fastapi_users.get_users_router(UserRead, UserUpdate), prefix="/users", tags=["users"])
#app.include_router(analyze_router, prefix="/analyze", tags=["analyze"])
#app.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
#below is the route to upload the actual audio file, coming back to fully understand the code
#app.include_router(upload_router, prefix="/upload", tags=["upload"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Music Practice Companion API!"
    " Please use the /docs endpoint to explore the API documentation."}

app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(auth.router)