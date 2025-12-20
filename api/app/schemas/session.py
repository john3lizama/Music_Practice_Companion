from pydantic import BaseModel

class PostCreate(BaseModel):
    title: str
    content: str

class SessionCreate(BaseModel):
    user_id: int
    token: str

class SessionUpdate(BaseModel):
    status: str
    progress: float