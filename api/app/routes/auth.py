from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.session import get_db

from .. import models, oauth2, utils
from ..rate_limit import limit_login
from ..schemas.schemas import Token, UserOut

router = APIRouter(tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    user_credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _: None = Depends(limit_login),
):
    user = (
        db.query(models.Users)
        .filter(models.Users.email == user_credentials.username)
        .first()
    )

    if not user:
        # Burn the same hashing cost as a real check so an attacker can't
        # tell "email exists" from "email doesn't" by timing the response.
        utils.verify(user_credentials.password, utils.DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    if not utils.verify(user_credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    access_token = oauth2.create_access_token(payload_data={"user_id": user.id})
    return {"token": access_token, "token_type": "Bearer"}


@router.get("/me", response_model=UserOut, tags=["Authentication"])
async def me(current_user: models.Users = Depends(oauth2.get_current_user)):
    """Return the authenticated user's own account."""
    return current_user
