from fastapi import APIRouter, status, HTTPException, Depends, Response
from sqlalchemy.orm import Session #session allowing us to fetch our user database
from app.database.session import get_db
from ..schemas.schemas import Token
from .. import models, utils, oauth2
from fastapi.security import OAuth2PasswordRequestForm


router = APIRouter(tags=['Authentication'])

@router.post("/login", response_model=Token)
async def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Users).filter(models.Users.email == user_credentials.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Invalid Credentials")
    
    if not utils.verify(user_credentials.password, user.password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Invalid Credentials")
    
    access_token = oauth2.create_access_token(payload_data={"user_id" : user.id}) #payload i want to add is only the id
    return {"token": access_token, "token_type" : "Bearer"}





################################################################################################################
#endpoints to add later on when code is more alligned with what i really want for the backend


"""

router(prefix="/auth)


@router.post("/register", reponse_model=Token)
aysnc def user_register()
    #creating a new user within our database
    #and give basic permissions


@router.post("/logout", response_model=Token)
async def user_logout()
    #implementing web token as long as user does not sign
    #out of their account on the specified device
    # (usually how mobile apps have it)


@router.Post("/me", response_model=Token)
async def get_user_account()
    #verify the user is the user then we 
    #get the user's information and home page


"""
