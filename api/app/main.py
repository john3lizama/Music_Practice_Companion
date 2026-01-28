from fastapi import FastAPI
from sqlalchemy.orm import Session
from app.routes import sessions, users, auth, votes
from . import models
from app.database.session import engine
from fastapi.middleware.cors import CORSMiddleware

#models.Base.metadata.create_all(bind=engine)

# creating FastAPI instance
app = FastAPI(title="Music Practice Companion API")

#CORS
origins = [
    "http://localhost.tiangolo.com",
    "https://localhost.tiangolo.com",
    "http://localhost",
    "http://localhost:8080",
    "https://google.com",
    "*" #allows all origins, eventually changing this to allow only my endpoint access
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/")
async def root():
    return {"message": "TESTING CI/CD PIPELINE"}

app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(votes.router)
