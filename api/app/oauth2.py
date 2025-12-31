from jose import JWTError, jwt
from datetime import datetime, timedelta
from .schemas import schemas
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from .config import settings

#creation of json web token (jwt)
#secret_key
#algo
#exp

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='login')

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def create_access_token(payload_data : dict):
    encode_data = payload_data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    encode_data.update({"exp" : expire})

    encoded_token = jwt.encode(encode_data, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_token


def verify_access_token(token: str, credentials_exceptions):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        id: str = payload.get("user_id") #payload data we introduced

        if not id:
            raise credentials_exceptions
        token_data = schemas.TokenData(id = id)
    except JWTError:
        raise credentials_exceptions
    return token_data

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exceptions = HTTPException(status_code=401, 
    detail=f"Could not validate credentials", headers={"WWW-Authenticate" : "Bearer"})
    return verify_access_token(token, credentials_exceptions)
