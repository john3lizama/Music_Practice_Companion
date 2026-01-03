from pydantic import BaseModel, EmailStr, ConfigDict, conint
from fastapi_users import schemas
from uuid import UUID
from typing import Optional, Literal
from datetime import datetime


############################################################################################################

class UserBase(BaseModel):
    #id:
    email: EmailStr
    password: str
    #created_at:

class UserOut(BaseModel):
    id: int
    email: str
    class Config:
        model_config = ConfigDict(from_attributes=True)


class UserUpdate(schemas.BaseUserUpdate):
    pass

class UserLogin(BaseModel):
    email: EmailStr
    password: str

############################################################################################################

class PostBase():
    id: UUID
    user_id: Optional[UUID] = None
    title: str
    notes: Optional[str] = None
    file_type: str
    content: str
    created_at: datetime

class Post(PostBase):
    pass #inherits all field from base

class PostCreate(BaseModel):
    title: str
    content: str

class PostOut(BaseModel):
    title: str
    content: str
    owner_id: int

class PostCreateOut(BaseModel):
    title: str
    content: str
    created_at: datetime
    id: int
    owner_id: int
    owner: UserOut
    #tells pydantic to ignore its not dict, and to convert it
    class Config:
        model_config = ConfigDict(from_attributes=True)

class SessionCreate(BaseModel):
    user_id: int
    token: str

class SessionUpdate(BaseModel):
    status: str
    progress: float

############################################################################################################

class Token(BaseModel):
    token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None

############################################################################################################

class Vote(BaseModel):
    session_id: int
    dir: Literal[0, 1]