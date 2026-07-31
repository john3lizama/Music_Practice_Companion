"""JWT creation/verification.

Security notes:
- Uses PyJWT (python-jose is unmaintained and drags in the vulnerable `ecdsa` package).
- `get_current_user` looks the user up in the DB, so tokens for deleted users
  are rejected immediately instead of living until expiry.
"""
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models
from .config import settings
from .database.session import get_db
from .schemas import schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def create_access_token(payload_data: dict) -> str:
    encode_data = payload_data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    encode_data.update({"exp": expire})
    return jwt.encode(encode_data, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str, credentials_exception: HTTPException) -> schemas.TokenData:
    try:
        # Pin the accepted algorithm list — never trust the token header.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        return schemas.TokenData(id=user_id)
    except jwt.InvalidTokenError:
        raise credentials_exception


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.Users:
    token_data = verify_access_token(token, _credentials_exception)
    user = db.query(models.Users).filter(models.Users.id == token_data.id).first()
    if user is None:
        # Token references a user that no longer exists.
        raise _credentials_exception
    return user
