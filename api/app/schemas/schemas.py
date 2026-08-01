from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr

                                # USER SCHEMAS
############################################################################################################


class UserBase(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


                                # SOCIAL SESSION (POST) SCHEMAS
############################################################################################################


class PostCreate(BaseModel):
    title: str
    content: str


class PostOut(BaseModel):
    title: str
    content: str
    owner_id: int
    model_config = ConfigDict(from_attributes=True)


class PostCreateOut(BaseModel):
    title: str
    content: str
    created_at: datetime
    id: int
    owner_id: int
    owner: UserOut
    model_config = ConfigDict(from_attributes=True)


class SessionListOut(BaseModel):
    session: PostCreateOut
    likes: int


                                # TOKEN SCHEMAS
############################################################################################################


class Token(BaseModel):
    token: str
    token_type: str


class TokenData(BaseModel):
    id: Optional[int] = None


                                # VOTES/LIKES SCHEMA
############################################################################################################


class Vote(BaseModel):
    session_id: int
    dir: Literal[0, 1]
