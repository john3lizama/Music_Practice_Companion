from fastapi import FastAPI
from sqlalchemy.orm import Session
from app.routes import sessions, users, auth, votes
from . import models
from app.database.session import engine

models.Base.metadata.create_all(bind=engine)

# creating FastAPI instance
app = FastAPI(title="Music Practice Companion API")

@app.get("/")
async def root():
    return {"message": "Welcome to the Music Practice Companion API!"
    " Please use the /docs endpoint to explore the API documentation."}

app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(votes.router)
